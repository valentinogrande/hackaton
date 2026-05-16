"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function createPeriod(formData: FormData) {
  const schoolId = String(formData.get("school_id") ?? "");
  const period = String(formData.get("period") ?? ""); // YYYY-MM
  const pool = Number(formData.get("pool_amount") ?? 0);

  if (!schoolId || !period || pool <= 0) return { error: "Faltan datos" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("payout_periods")
    .insert({ school_id: schoolId, period, pool_amount: pool });
  if (error) return { error: error.message };

  revalidatePath("/admin/payouts");
  return { ok: true as const };
}

export async function recomputeScores(periodId: string) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("recompute_pools_v2", { p_period_id: periodId });
  if (error) return { error: error.message };
  revalidatePath("/admin/payouts");
  return { ok: true as const };
}

export async function markWithdrawalPaid(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("withdrawals")
    .update({ status: "paid", processed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/payouts");
  return { ok: true as const };
}
