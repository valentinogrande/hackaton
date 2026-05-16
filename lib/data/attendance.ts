import { createClient } from "@/lib/supabase/server";

export async function listAttendanceForStudent(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance")
    .select("id, date, status, subjects(name)")
    .eq("student_id", studentId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAttendanceForSubject(subjectId: string, date: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance")
    .select("id, status, student_id, profiles(full_name)")
    .eq("subject_id", subjectId)
    .eq("date", date);
  if (error) throw error;
  return data ?? [];
}
