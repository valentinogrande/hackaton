import { createClient } from "@/lib/supabase/server";

export async function getCurrentPeriodForSchool(schoolId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payout_periods")
    .select("*")
    .eq("school_id", schoolId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getStudentScoreForPeriod(
  studentId: string,
  periodId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_scores")
    .select("*")
    .eq("student_id", studentId)
    .eq("period_id", periodId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDemoSchoolId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schools")
    .select("id")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}
