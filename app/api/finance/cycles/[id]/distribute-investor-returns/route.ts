import { NextResponse } from "next/server";
import { createFinanceAdminClient } from "@/lib/finance/db";
import { requireAdmin } from "@/lib/finance/api-auth";
import { recordAudit } from "@/lib/finance/ledger";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const admin = createFinanceAdminClient();
  const { data: returns, error: rErr } = await admin
    .from("investor_returns")
    .select("id, source_id, amount_usd, status")
    .eq("cycle_id", id);
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  let paid = 0;
  for (const r of returns ?? []) {
    if (r.status !== "pending") continue;
    const { error: upErr } = await admin
      .from("investor_returns")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", r.id);
    if (upErr) continue;
    await recordAudit({
      kind: "investor_return",
      actorId: auth.actor.userId,
      subjectType: "investor_returns",
      subjectId: r.id,
      amount: Number(r.amount_usd),
      currency: "USD",
      payload: { cycle_id: id, source_id: r.source_id, action: "marked_paid" },
    });
    paid += 1;
  }

  return NextResponse.json({ ok: true, paid });
}
