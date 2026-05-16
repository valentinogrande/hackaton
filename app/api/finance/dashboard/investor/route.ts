import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/finance/api-auth";
import { getCapitalSource, listContributionsForSource } from "@/lib/data/finance/capital";
import { getInvestorReturnsForSource } from "@/lib/data/finance/yield";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const sourceId = url.searchParams.get("source_id");
  if (!sourceId) {
    return NextResponse.json({ error: "source_id required" }, { status: 400 });
  }

  const source = await getCapitalSource(sourceId);
  if (!source) return NextResponse.json({ error: "not found" }, { status: 404 });

  const contributions = await listContributionsForSource(sourceId);
  const returns = await getInvestorReturnsForSource(sourceId);

  const totalContributedUsd = contributions
    .filter((c) => c.status === "confirmed")
    .reduce((acc, c) => acc + Number(c.amount_usd ?? 0), 0);

  const totalReturnsUsd = returns
    .filter((r) => r.status === "paid")
    .reduce((acc, r) => acc + Number(r.amount_usd ?? 0), 0);

  const months = returns.length || 1;
  const annualizedYieldPct =
    totalContributedUsd > 0
      ? ((totalReturnsUsd / totalContributedUsd) * (12 / months)) * 100
      : 0;

  return NextResponse.json({
    source,
    total_contributed_usd: totalContributedUsd,
    total_returns_paid_usd: totalReturnsUsd,
    estimated_annualized_yield_pct: Math.round(annualizedYieldPct * 100) / 100,
    contributions,
    returns,
  });
}
