"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { extractTextFromPdf, generateMixedItems } from "@/lib/gemini";
import { POINTS_MAP } from "@/lib/study-types";
import type { SessionItem } from "@/lib/study-types";
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
