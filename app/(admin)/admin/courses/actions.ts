"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createCourse(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const year = Number(formData.get("year") ?? 0);
  if (!name || !year) return { error: "Faltan datos" };

  const supabase = await createClient();

  // Auto-assign to the first school so the course is included in pool recomputes.
  const { data: school } = await supabase
    .from("schools")
    .select("id")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("courses")
    .insert({ name, year, school_id: school?.id ?? null });
  if (error) return { error: error.message };

  revalidatePath("/admin/courses");
  return { ok: true as const };
}

export async function deleteCourse(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/courses");
  return { ok: true as const };
}

export async function enrollStudent(courseId: string, studentId: string) {
  if (!courseId || !studentId) return { error: "Faltan datos" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("enrollments")
    .insert({ course_id: courseId, student_id: studentId });
  if (error) return { error: error.message };
  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true as const };
}

export async function unenrollStudent(courseId: string, studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("course_id", courseId)
    .eq("student_id", studentId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true as const };
}
