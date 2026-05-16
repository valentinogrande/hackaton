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

export type BulkGradeEntry = {
  studentId: string;
  value: number; // 1-10
  note?: string | null;
};

export async function bulkCreateGrades(args: {
  subjectId: string;
  period: string;
  entries: BulkGradeEntry[];
}): Promise<{ ok: true; inserted: number } | { error: string }> {
  if (!args.subjectId) return { error: "Falta materia" };
  if (!args.period?.trim()) return { error: "Falta período" };

  const valid = args.entries.filter(
    (e) =>
      e.studentId &&
      typeof e.value === "number" &&
      !Number.isNaN(e.value) &&
      e.value >= 1 &&
      e.value <= 10
  );
  if (valid.length === 0) return { error: "Cargá al menos una nota válida (1-10)" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const rows = valid.map((e) => ({
    student_id: e.studentId,
    subject_id: args.subjectId,
    period: args.period,
    value: e.value,
    note: e.note?.trim() || null,
    created_by: user.id,
  }));

  const { error } = await supabase.from("grades").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/teacher/grades");
  return { ok: true, inserted: valid.length };
}
