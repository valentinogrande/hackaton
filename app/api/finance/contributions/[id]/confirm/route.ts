import { NextResponse } from "next/server";
import { z } from "zod";
import { createFinanceAdminClient } from "@/lib/finance/db";
import { requireAdmin } from "@/lib/finance/api-auth";
import { recordAudit } from "@/lib/finance/ledger";
import { DEFAULT_FX_ARS_PER_USD, arsToUsd, round2 } from "@/lib/finance/economy";

const ConfirmSchema = z.object({
  fx_rate: z.number().positive().optional(),
  amount_usd_override: z.number().positive().optional(),
  fci_code: z.enum(["MM_USD", "RF_USD", "CASH_USD"]).default("MM_USD"),
  share_price: z.number().positive().default(1),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const json = await req.json().catch(() => ({}));
  const parsed = ConfirmSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const admin = createFinanceAdminClient();

  const { data: contrib, error: cErr } = await admin
    .from("capital_contributions")
    .select("*")
    .eq("id", id)
    .single();
  if (cErr || !contrib)
    return NextResponse.json({ error: "contribution not found" }, { status: 404 });
  if (contrib.status !== "pending")
    return NextResponse.json(
      { error: `contribution already ${contrib.status}` },
      { status: 409 },
    );

  let amountUsd: number;
  let fxRate: number | null = null;
  if (contrib.currency === "USD") {
    amountUsd = parsed.data.amount_usd_override ?? Number(contrib.amount);
  } else {
    fxRate = parsed.data.fx_rate ?? DEFAULT_FX_ARS_PER_USD;
    amountUsd =
      parsed.data.amount_usd_override ?? arsToUsd(Number(contrib.amount), fxRate);
  }
  amountUsd = round2(amountUsd);

  const { error: upErr } = await admin
    .from("capital_contributions")
    .update({
      status: "confirmed",
      amount_usd: amountUsd,
      fx_rate: fxRate,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const shares = round2(amountUsd / parsed.data.share_price);
  await admin.from("fci_subscriptions").insert({
    contribution_id: id,
    fci_code: parsed.data.fci_code,
    amount_usd: amountUsd,
    shares,
    share_price: parsed.data.share_price,
  });

  await recordAudit({
    kind: "capital_in",
    actorId: auth.actor.userId,
    subjectType: "capital_contributions",
    subjectId: id,
    amount: amountUsd,
    currency: "USD",
    payload: {
      source_id: contrib.source_id,
      original_amount: contrib.amount,
      original_currency: contrib.currency,
      fx_rate: fxRate,
      fci_code: parsed.data.fci_code,
    },
  });

  await recordAudit({
    kind: "fci_subscription",
    actorId: auth.actor.userId,
    subjectType: "capital_contributions",
    subjectId: id,
    amount: amountUsd,
    currency: "USD",
    payload: { fci_code: parsed.data.fci_code, shares, share_price: parsed.data.share_price },
  });

  return NextResponse.json({ ok: true, amount_usd: amountUsd, shares });
}
