"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  generateQuizFromPdf,
  generateFlashcardsFromPdf,
  generateClozeFromPdf,
  generateTrueFalseFromPdf,
} from "@/lib/gemini";
import { POINTS_PER_CORRECT_ANSWER } from "@/lib/tokens/economy";
import type { Database, Json } from "@/lib/database.types";

type Mode = Database["public"]["Enums"]["study_mode"];

const QUESTIONS_PER_SESSION = 5;

type NewRow = {
  session_id: string;
  kind: Database["public"]["Enums"]["question_kind"];
  prompt: Json;
  correct: Json;
};

export async function startStudySession(
  materialId: string,
  mode: Mode
): Promise<{ sessionId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: material, error: mErr } = await supabase
    .from("materials")
    .select("id, title, pdf_path")
    .eq("id", materialId)
    .single();
  if (mErr || !material) return { error: "Material no encontrado" };

  const { data: pdfBlob, error: dlErr } = await supabase.storage
    .from("materials")
    .download(material.pdf_path);
  if (dlErr || !pdfBlob) return { error: "No se pudo descargar el PDF" };

  let rows: { kind: NewRow["kind"]; prompt: Json; correct: Json }[];
  try {
    const bytes = new Uint8Array(await pdfBlob.arrayBuffer());

    if (mode === "quiz") {
      const items = await generateQuizFromPdf({
        pdfBytes: bytes,
        count: QUESTIONS_PER_SESSION,
      });
      rows = items.map((q) => ({
        kind: "multiple_choice",
        prompt: { question: q.question, options: q.options },
        correct: { correctIndex: q.correctIndex, explanation: q.explanation },
      }));
    } else if (mode === "flashcards") {
      const items = await generateFlashcardsFromPdf({
        pdfBytes: bytes,
        count: QUESTIONS_PER_SESSION + 3,
      });
      rows = items.map((c) => ({
        kind: "flashcard",
        prompt: { front: c.front, back: c.back },
        correct: {},
      }));
    } else if (mode === "fill_blank") {
      const items = await generateClozeFromPdf({
        pdfBytes: bytes,
        count: QUESTIONS_PER_SESSION,
      });
      rows = items.map((c) => ({
        kind: "fill_blank",
        prompt: { sentence: c.sentence, options: c.options },
        correct: { correctIndex: c.correctIndex, answer: c.answer },
      }));
    } else if (mode === "true_false") {
      const items = await generateTrueFalseFromPdf({
        pdfBytes: bytes,
        count: QUESTIONS_PER_SESSION + 3,
      });
      rows = items.map((t) => ({
        kind: "true_false",
        prompt: { statement: t.statement },
        correct: { isTrue: t.isTrue, explanation: t.explanation },
      }));
    } else {
      return { error: `Modo "${mode}" todavía no implementado` };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error generando preguntas";
    return { error: msg };
  }

  if (rows.length === 0) return { error: "Gemini no generó preguntas" };

  const admin = createAdminClient();

  const { data: session, error: sErr } = await admin
    .from("study_sessions")
    .insert({
      student_id: user.id,
      material_id: material.id,
      mode,
    })
    .select("id")
    .single();
  if (sErr || !session)
    return { error: sErr?.message ?? "Error creando sesión" };

  const sessionRows: NewRow[] = rows.map((r) => ({
    session_id: session.id,
    kind: r.kind,
    prompt: r.prompt,
    correct: r.correct,
  }));

  const { error: qErr } = await admin.from("questions").insert(sessionRows);
  if (qErr) return { error: qErr.message };

  return { sessionId: session.id };
}

type AnswerInput =
  | { selectedIndex: number }
  | { knewIt: boolean }
  | { selectedTrue: boolean };

export type AnswerResult =
  | {
      isCorrect: boolean;
      pointsAwarded: number;
      explanation: string;
      // For visual feedback in the UI.
      correctIndex?: number;
      correctBoolean?: boolean;
      nextQuestionId: string | null;
      isLast: boolean;
    }
  | { error: string };

export async function answerQuestion(args: {
  questionId: string;
  response: AnswerInput;
}): Promise<AnswerResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: q, error: qErr } = await supabase
    .from("questions")
    .select(
      "id, kind, correct, session_id, study_sessions(student_id), created_at"
    )
    .eq("id", args.questionId)
    .single();
  if (qErr || !q) return { error: "Pregunta no encontrada" };
  if (q.study_sessions?.student_id !== user.id) {
    return { error: "Esta sesión no es tuya" };
  }

  const correct = (q.correct ?? {}) as {
    correctIndex?: number;
    isTrue?: boolean;
    explanation?: string;
  };

  let isCorrect = false;
  let correctIndex: number | undefined;
  let correctBoolean: boolean | undefined;
  let explanation = "";

  switch (q.kind) {
    case "multiple_choice":
    case "fill_blank": {
      if (!("selectedIndex" in args.response)) {
        return { error: "Respuesta inválida" };
      }
      correctIndex = correct.correctIndex ?? -1;
      explanation = correct.explanation ?? "";
      isCorrect = args.response.selectedIndex === correctIndex;
      break;
    }
    case "flashcard": {
      if (!("knewIt" in args.response)) {
        return { error: "Respuesta inválida" };
      }
      isCorrect = args.response.knewIt === true;
      break;
    }
    case "true_false": {
      if (!("selectedTrue" in args.response)) {
        return { error: "Respuesta inválida" };
      }
      correctBoolean = correct.isTrue ?? false;
      explanation = correct.explanation ?? "";
      isCorrect = args.response.selectedTrue === correctBoolean;
      break;
    }
    default:
      return { error: `Tipo "${q.kind}" no soportado` };
  }

  const pointsAwarded = isCorrect
    ? POINTS_PER_CORRECT_ANSWER[q.kind as keyof typeof POINTS_PER_CORRECT_ANSWER]
    : 0;

  const admin = createAdminClient();

  const { data: answer, error: aErr } = await admin
    .from("answers")
    .insert({
      question_id: q.id,
      student_id: user.id,
      response: args.response as unknown as Json,
      is_correct: isCorrect,
      points_awarded: pointsAwarded,
    })
    .select("id")
    .single();
  if (aErr) return { error: aErr.message };

  if (pointsAwarded > 0) {
    const { error: lErr } = await admin.from("points_ledger").insert({
      student_id: user.id,
      delta: pointsAwarded,
      reason: "correct_answer",
      ref_id: answer?.id,
    });
    if (lErr) return { error: lErr.message };
  }

  const { data: nextQ } = await admin
    .from("questions")
    .select("id, created_at")
    .eq("session_id", q.session_id)
    .gt("created_at", q.created_at)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (!nextQ) {
    await admin
      .from("study_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", q.session_id);
  }

  revalidatePath(`/student/estudiar/${q.session_id}`);
  return {
    isCorrect,
    pointsAwarded,
    explanation,
    correctIndex,
    correctBoolean,
    nextQuestionId: nextQ?.id ?? null,
    isLast: !nextQ,
  };
}
