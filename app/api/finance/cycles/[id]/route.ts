import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/finance/api-auth";
import { getYieldCycle, getInvestorReturnsForCycle } from "@/lib/data/finance/yield";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const cycle = await getYieldCycle(id);
  if (!cycle) return NextResponse.json({ error: "not found" }, { status: 404 });

  const returns = await getInvestorReturnsForCycle(id);
  return NextResponse.json({ cycle, investor_returns: returns });
}
