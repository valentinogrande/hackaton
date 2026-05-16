import { createFinanceClient } from "@/lib/finance/db";

export async function listPaymentTransactionsForWithdrawal(withdrawalId: string) {
  const supabase = await createFinanceClient();
  const { data, error } = await supabase
    .from("payment_transactions")
    .select("*")
    .eq("withdrawal_id", withdrawalId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listOpenComplianceFlags() {
  const supabase = await createFinanceClient();
  const { data, error } = await supabase
    .from("compliance_flags")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listRecentAuditEvents(limit = 100) {
  const supabase = await createFinanceClient();
  const { data, error } = await supabase
    .from("audit_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
