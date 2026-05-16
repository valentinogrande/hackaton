import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createFinanceAdminClient } from "@/lib/finance/db";
import { getPaymentGateway } from "@/lib/finance/payment-gateway";
import { recordAudit } from "@/lib/finance/ledger";

// MercadoPago sends notifications with header `x-signature: ts=...,v1=<hex>`
// where v1 = HMAC_SHA256(secret, `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`).
// Doc: https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks
function verifyMercadoPagoSignature(req: Request, dataId: string | null): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // dev mode — accept

  const sigHeader = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");
  if (!sigHeader || !requestId || !dataId) return false;

  const parts = Object.fromEntries(
    sigHeader.split(",").map((s) => {
      const [k, v] = s.split("=");
      return [k.trim(), v?.trim() ?? ""];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const message = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(message).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const b = body as { type?: string; data?: { id?: string } };
  const providerPaymentId = b.data?.id ?? null;

  if (!verifyMercadoPagoSignature(req, providerPaymentId)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 403 });
  }

  const gateway = getPaymentGateway();
  let webhook;
  try {
    webhook = await gateway.handleWebhook(body, req.headers);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  const admin = createFinanceAdminClient();
  const { data: tx } = await admin
    .from("payment_transactions")
    .select("id, withdrawal_id, status")
    .eq("provider_payment_id", webhook.providerPaymentId)
    .maybeSingle();
  if (!tx) return NextResponse.json({ ok: true, ignored: true });

  await admin
    .from("payment_transactions")
    .update({
      status: webhook.status,
      raw_response: webhook.raw as object,
      finalized_at: ["approved", "rejected", "failed", "refunded"].includes(webhook.status)
        ? new Date().toISOString()
        : null,
    })
    .eq("id", tx.id);

  let newWithdrawalStatus: "processing" | "paid" | "rejected" = "processing";
  if (webhook.status === "approved") newWithdrawalStatus = "paid";
  else if (["rejected", "failed"].includes(webhook.status))
    newWithdrawalStatus = "rejected";

  await admin
    .from("withdrawals")
    .update({
      status: newWithdrawalStatus,
      processed_at:
        newWithdrawalStatus === "paid" || newWithdrawalStatus === "rejected"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", tx.withdrawal_id);

  await recordAudit({
    kind: newWithdrawalStatus === "paid" ? "withdrawal_paid" : "withdrawal_rejected",
    subjectType: "withdrawals",
    subjectId: tx.withdrawal_id,
    payload: {
      provider_payment_id: webhook.providerPaymentId,
      remote_status: webhook.status,
      via: "webhook",
    },
  });

  return NextResponse.json({ ok: true });
}
