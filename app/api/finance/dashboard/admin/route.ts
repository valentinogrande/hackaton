import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/finance/api-auth";
import { getTotalAumUsd, getAumBySource } from "@/lib/data/finance/capital";
import { getCurrentCycle, listYieldCycles } from "@/lib/data/finance/yield";
import { createFinanceClient } from "@/lib/finance/db";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const totalAumUsd = await getTotalAumUsd();
  const aumBySource = await getAumBySource();
  const currentCycle = await getCurrentCycle();
  const recentCycles = await listYieldCycles(12);

  const supabase = await createFinanceClient();
  const { count: openFlagsCount } = await supabase
    .from("compliance_flags")
    .select("*", { count: "exact", head: true })
    .eq("status", "open");

  const { count: pendingWithdrawalsCount } = await supabase
    .from("withdrawals")
    .select("*", { count: "exact", head: true })
    .in("status", ["requested", "processing"]);

  return NextResponse.json({
    total_aum_usd: totalAumUsd,
    sources_count: aumBySource.size,
    current_cycle: currentCycle,
    recent_cycles: recentCycles,
    open_compliance_flags: openFlagsCount ?? 0,
    pending_withdrawals: pendingWithdrawalsCount ?? 0,
  });
}
