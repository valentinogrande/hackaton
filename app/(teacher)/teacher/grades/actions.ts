"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createGrade(formData: FormData) {
  const student_id = String(formData.get("student_id") ?? "");
  const subject_id = String(formData.get("subject_id") ?? "");
  const value = Number(formData.get("value") ?? 0);
  const period = String(formData.get("period") ?? "T1");
  const note = String(formData.get("note") ?? "") || null;

  if (!student_id || !subject_id || !value) return { error: "Faltan datos" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase.from("grades").insert({
    student_id,
    subject_id,
    value,
    period,
    note,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/teacher/grades");
  return { ok: true as const };
}

export async function deleteGrade(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("grades").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/teacher/grades");
  return { ok: true as const };
}
