import { createClient } from "@/lib/supabase/server";

export async function listWithdrawalsForStudent(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("withdrawals")
    .select("*")
    .eq("student_id", studentId)
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listPendingWithdrawals() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("withdrawals")
    .select("*, profiles(full_name)")
    .in("status", ["requested", "processing"])
    .order("requested_at");
  if (error) throw error;
  return data ?? [];
}
