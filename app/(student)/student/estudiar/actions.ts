"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type Mode = Database["public"]["Enums"]["study_mode"];

export async function startStudySession(_args: { materialId: string; mode: Mode }) {
  // TODO(back): create study_sessions row, call Gemini to generate questions,
  // bulk-insert into `questions`. Return sessionId + first question.
  throw new Error("TODO: startStudySession not implemented");
}

export async function answerQuestion(_args: {
  questionId: string;
  response: unknown;
}): Promise<{
  isCorrect: boolean;
  pointsAwarded: number;
  nextQuestionId: string | null;
}> {
  // TODO(back + tokens):
  // 1. Look up question (server side) and compare response.
  // 2. Insert into `answers` with is_correct + points_awarded (use lib/tokens/economy.ts).
  // 3. Insert into `points_ledger` via createAdminClient (trigger updates balance).
  // 4. Return next question id or null when session ends.
  throw new Error("TODO: answerQuestion not implemented");
}

// Used in client component to know the user is allowed to study a given material.
export async function getMaterialContext(materialId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .select("id, title, subject_id, subjects(name)")
    .eq("id", materialId)
    .single();
  if (error) return null;
  return data;
}
