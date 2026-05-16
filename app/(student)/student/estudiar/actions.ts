"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { extractTextFromPdf, generateMixedItems } from "@/lib/gemini";
import { POINTS_MAP } from "@/lib/study-types";
import type { SessionItem } from "@/lib/study-types";
import {
  POINTS_PER_CORRECT_ANSWER,
  streakMultiplier,
} from "@/lib/tokens/economy";
import { computeCurrentStreak } from "@/lib/data/streaks";
import type { Database, Json } from "@/lib/database.types";

type QuestionKind = Database["public"]["Enums"]["question_kind"];

function itemToRow(item: SessionItem): {
  kind: QuestionKind;
  prompt: Json;
  correct: Json;
} {
  switch (item.type) {
    case "quiz":
      return {
        kind: "multiple_choice",
        prompt: { type: "quiz", question: item.question, options: item.options, hash: item.hash } as Json,
        correct: { correctIndex: item.correctIndex, explanation: item.explanation } as Json,
      };
    case "flashcard":
      return {
        kind: "flashcard",
        prompt: { type: "flashcard", front: item.front, back: item.back, hash: item.hash } as Json,
        correct: {} as Json,
      };
    case "cloze":
      return {
        kind: "fill_blank",
        prompt: { type: "cloze", sentence: item.sentence, options: item.options, hash: item.hash } as Json,
        correct: { correctIndex: item.correctIndex, answer: item.answer } as Json,
      };
    case "trueFalse":
      return {
        kind: "true_false",
        prompt: { type: "trueFalse", statement: item.statement, hash: item.hash } as Json,
        correct: { isTrue: item.isTrue, explanation: item.explanation } as Json,
      };
  }
}

export async function startStudySession(
  materialId: string
): Promise<
  { sessionId: string; items: SessionItem[]; questionIds: Record<string, string> } | { error: string }
> {
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

  let items: SessionItem[];
  try {
    const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
    const text = await extractTextFromPdf(bytes);
    if (!text.trim()) return { error: "El PDF no tiene texto extraíble" };
    items = await generateMixedItems(text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error generando preguntas";
    return { error: msg };
  }

  if (items.length === 0) return { error: "Gemini no generó preguntas" };

  const admin = createAdminClient();

  const { data: session, error: sErr } = await admin
    .from("study_sessions")
    .insert({
      student_id: user.id,
      material_id: material.id,
      mode: "quiz",
    })
    .select("id")
    .single();
  if (sErr || !session) return { error: sErr?.message ?? "Error creando sesión" };

  const rows = items.map((item) => ({
    session_id: session.id,
    ...itemToRow(item),
  }));

  const { data: insertedQs, error: qErr } = await admin
    .from("questions")
    .insert(rows)
    .select("id, prompt");
  if (qErr || !insertedQs) return { error: qErr?.message ?? "Error guardando preguntas" };

  const questionIds: Record<string, string> = {};
  for (const q of insertedQs) {
    const prompt = q.prompt as Record<string, unknown>;
    const hash = prompt?.hash as string | undefined;
    if (hash) questionIds[hash] = q.id;
  }

  return { sessionId: session.id, items, questionIds };
}

export async function recordAnswer(args: {
  questionId: string;
  isCorrect: boolean;
  itemType: "quiz" | "flashcard" | "cloze" | "trueFalse";
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const pointsAwarded = args.isCorrect ? (POINTS_MAP[args.itemType] ?? 0) : 0;
  const admin = createAdminClient();

  const { data: answer, error: aErr } = await admin
    .from("answers")
    .insert({
      question_id: args.questionId,
      student_id: user.id,
      response: { isCorrect: args.isCorrect } as unknown as Json,
      is_correct: args.isCorrect,
      points_awarded: pointsAwarded,
    })
    .select("id")
    .single();
  if (aErr || !answer) return;

  if (pointsAwarded > 0) {
    await admin.from("points_ledger").insert({
      student_id: user.id,
      delta: pointsAwarded,
      reason: "correct_answer",
      ref_id: answer.id,
    });
  }
}

export async function finishSession(sessionId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("study_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId);
  revalidatePath("/student");
  revalidatePath("/student/estudiar");
}

// ─── Streak-aware answer scoring (legacy sessions) ────────────────────────────

type AnswerInput =
  | { selectedIndex: number }
  | { knewIt: boolean }
  | { selectedTrue: boolean };

export type AnswerResult =
  | {
      isCorrect: boolean;
      pointsAwarded: number;
      basePoints: number;
      streakDays: number;
      streakMultiplier: number;
      streakTier: "none" | "warmup" | "fire" | "blaze" | "legend";
      explanation: string;
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
    .select("id, kind, correct, session_id, study_sessions(student_id), created_at")
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
      if (!("selectedIndex" in args.response)) return { error: "Respuesta inválida" };
      correctIndex = correct.correctIndex ?? -1;
      explanation = correct.explanation ?? "";
      isCorrect = args.response.selectedIndex === correctIndex;
      break;
    }
    case "flashcard": {
      if (!("knewIt" in args.response)) return { error: "Respuesta inválida" };
      isCorrect = args.response.knewIt === true;
      break;
    }
    case "true_false": {
      if (!("selectedTrue" in args.response)) return { error: "Respuesta inválida" };
      correctBoolean = correct.isTrue ?? false;
      explanation = correct.explanation ?? "";
      isCorrect = args.response.selectedTrue === correctBoolean;
      break;
    }
    default:
      return { error: `Tipo "${q.kind}" no soportado` };
  }

  const basePoints = isCorrect
    ? POINTS_PER_CORRECT_ANSWER[q.kind as keyof typeof POINTS_PER_CORRECT_ANSWER]
    : 0;

  const streakDays = await computeCurrentStreak(user.id);
  const { multiplier, tier } = streakMultiplier(streakDays);
  const pointsAwarded = Math.round(basePoints * multiplier);

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
    basePoints,
    streakDays,
    streakMultiplier: multiplier,
    streakTier: tier,
    explanation,
    correctIndex,
    correctBoolean,
    nextQuestionId: nextQ?.id ?? null,
    isLast: !nextQ,
  };
}
