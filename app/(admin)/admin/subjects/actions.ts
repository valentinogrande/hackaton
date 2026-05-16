"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createSubject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const course_id = String(formData.get("course_id") ?? "");
  const teacherRaw = String(formData.get("teacher_id") ?? "");
  const teacher_id = teacherRaw && teacherRaw !== "__none__" ? teacherRaw : null;

  if (!name || !course_id) return { error: "Faltan datos" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("subjects")
    .insert({ name, course_id, teacher_id });
  if (error) return { error: error.message };

  revalidatePath("/admin/subjects");
  return { ok: true as const };
}

export async function setSubjectTeacher(subjectId: string, teacherId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("subjects")
    .update({ teacher_id: teacherId })
    .eq("id", subjectId);
  if (error) return { error: error.message };
  revalidatePath("/admin/subjects");
  return { ok: true as const };
}

export async function deleteSubject(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/subjects");
  return { ok: true as const };
}
