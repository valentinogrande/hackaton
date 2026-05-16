import { createFinanceClient } from "@/lib/finance/db";

export async function listYieldCycles(limit = 24) {
  const supabase = await createFinanceClient();
  const { data, error } = await supabase
    .from("yield_cycles")
    .select("*")
    .order("period", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getYieldCycle(id: string) {
  const supabase = await createFinanceClient();
  const { data, error } = await supabase
    .from("yield_cycles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getInvestorReturnsForCycle(cycleId: string) {
  const supabase = await createFinanceClient();
  const { data, error } = await supabase
    .from("investor_returns")
    .select("*, capital_sources(display_name, kind)")
    .eq("cycle_id", cycleId)
    .order("amount_usd", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getInvestorReturnsForSource(sourceId: string) {
  const supabase = await createFinanceClient();
  const { data, error } = await supabase
    .from("investor_returns")
    .select("*, yield_cycles(period, status, distributed_at)")
    .eq("source_id", sourceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCurrentCycle() {
  const supabase = await createFinanceClient();
  const { data, error } = await supabase
    .from("yield_cycles")
    .select("*")
    .order("period", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
