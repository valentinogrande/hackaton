import { createFinanceClient } from "@/lib/finance/db";

export async function listCapitalSources() {
  const supabase = await createFinanceClient();
  const { data, error } = await supabase
    .from("capital_sources")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCapitalSource(id: string) {
  const supabase = await createFinanceClient();
  const { data, error } = await supabase
    .from("capital_sources")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listContributionsForSource(sourceId: string) {
  const supabase = await createFinanceClient();
  const { data, error } = await supabase
    .from("capital_contributions")
    .select("*")
    .eq("source_id", sourceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTotalAumUsd() {
  const supabase = await createFinanceClient();
  const { data, error } = await supabase
    .from("capital_contributions")
    .select("amount_usd")
    .eq("status", "confirmed");
  if (error) throw error;
  return (data ?? []).reduce((acc, c) => acc + Number(c.amount_usd ?? 0), 0);
}

export async function getAumBySource() {
  const supabase = await createFinanceClient();
  const { data, error } = await supabase
    .from("capital_contributions")
    .select("source_id, amount_usd")
    .eq("status", "confirmed");
  if (error) throw error;

  const map = new Map<string, number>();
  for (const c of data ?? []) {
    const cur = map.get(c.source_id) ?? 0;
    map.set(c.source_id, cur + Number(c.amount_usd ?? 0));
  }
  return map;
}
