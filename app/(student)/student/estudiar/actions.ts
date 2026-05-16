"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { generateQuizFromPdf } from "@/lib/gemini";
import { POINTS_PER_CORRECT_ANSWER } from "@/lib/tokens/economy";

const QUESTIONS_PER_SESSION = 5;

export async function startStudySession(
  materialId: string
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

  let questions;
  try {
    const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
    questions = await generateQuizFromPdf({
      pdfBytes: bytes,
      count: QUESTIONS_PER_SESSION,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error generando preguntas";
    return { error: msg };
  }

  if (questions.length === 0) return { error: "Gemini no generó preguntas" };

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

  const rows = questions.map((q) => ({
    session_id: session.id,
    kind: "multiple_choice" as const,
    prompt: { question: q.question, options: q.options },
    correct: { correctIndex: q.correctIndex, explanation: q.explanation },
  }));

  const { error: qErr } = await admin.from("questions").insert(rows);
  if (qErr) return { error: qErr.message };

  return { sessionId: session.id };
}

export async function answerQuestion(args: {
  questionId: string;
  selectedIndex: number;
}): Promise<
  | {
      isCorrect: boolean;
      correctIndex: number;
      explanation: string;
      pointsAwarded: number;
      nextQuestionId: string | null;
      isLast: boolean;
    }
  | { error: string }
> {
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

  const correctData = q.correct as {
    correctIndex: number;
    explanation: string;
  } | null;
  const correctIndex = correctData?.correctIndex ?? -1;
  const explanation = correctData?.explanation ?? "";

  const isCorrect = args.selectedIndex === correctIndex;
  const pointsAwarded = isCorrect
    ? POINTS_PER_CORRECT_ANSWER[q.kind as keyof typeof POINTS_PER_CORRECT_ANSWER]
    : 0;

  const admin = createAdminClient();

  const { data: answer, error: aErr } = await admin
    .from("answers")
    .insert({
      question_id: q.id,
      student_id: user.id,
      response: { selectedIndex: args.selectedIndex },
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
    correctIndex,
    explanation,
    pointsAwarded,
    nextQuestionId: nextQ?.id ?? null,
    isLast: !nextQ,
  };
}
