import { createClient } from "@/lib/supabase/server";

export async function listGradesForStudent(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grades")
    .select("id, value, period, note, created_at, subjects(name)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listGradesForSubject(subjectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grades")
    .select("id, value, period, note, created_at, student_id, profiles(full_name)")
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
