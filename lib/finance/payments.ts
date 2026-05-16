// Withdrawal payment processing — wires the gateway to the DB.

import { createFinanceAdminClient } from "@/lib/finance/db";
import { getPaymentGateway } from "@/lib/finance/payment-gateway";
import { validateDestination, type Destination } from "@/lib/finance/cbu";
import { recordAudit } from "@/lib/finance/ledger";

export type ProcessWithdrawalResult =
  | { ok: true; providerPaymentId: string; status: string; transactionId: string }
  | { ok: false; error: string };

export async function processWithdrawal(
  withdrawalId: string,
  actorId: string | null,
): Promise<ProcessWithdrawalResult> {
  const admin = createFinanceAdminClient();

  const { data: withdrawal, error: wErr } = await admin
    .from("withdrawals")
    .select("id, student_id, amount, destination, status")
    .eq("id", withdrawalId)
    .single();
  if (wErr || !withdrawal) return { ok: false, error: wErr?.message ?? "Withdrawal not found" };

  if (!["requested", "processing"].includes(withdrawal.status)) {
    return { ok: false, error: `Withdrawal in status ${withdrawal.status}` };
  }

  const destination = withdrawal.destination as Destination | null;
  if (!destination) return { ok: false, error: "Withdrawal has no destination" };
  const valid = validateDestination(destination);
  if (!valid.ok) return { ok: false, error: valid.error };

  const { data: holds } = await admin
    .from("student_holds")
    .select("id, reason")
    .eq("student_id", withdrawal.student_id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (holds) {
    return { ok: false, error: `Student on hold: ${holds.reason}` };
  }

  const gateway = getPaymentGateway();

  const { data: tx, error: txErr } = await admin
    .from("payment_transactions")
    .insert({
      withdrawal_id: withdrawalId,
      provider: gateway.providerName,
      amount: withdrawal.amount,
      currency: "ARS",
      status: "pending",
      destination_snapshot: destination,
      raw_request: {
        destination,
        amount: withdrawal.amount,
        externalReference: withdrawalId,
      },
    })
    .select("id")
    .single();
  if (txErr || !tx) return { ok: false, error: txErr?.message ?? "Could not create transaction" };

  let payResult;
  try {
    payResult = await gateway.payToCvu({
      destinationCvu:
        destination.type === "cvu" || destination.type === "cbu"
          ? destination.value
          : "",
      amount: Number(withdrawal.amount),
      currency: "ARS",
      externalReference: withdrawalId,
      description: `StudyPay payout ${withdrawalId}`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await admin
      .from("payment_transactions")
      .update({
        status: "failed",
        error_message: message,
        finalized_at: new Date().toISOString(),
      })
      .eq("id", tx.id);
    await recordAudit({
      kind: "withdrawal_rejected",
      actorId,
      subjectType: "withdrawals",
      subjectId: withdrawalId,
      amount: Number(withdrawal.amount),
      currency: "ARS",
      payload: { error: message, transaction_id: tx.id },
    });
    return { ok: false, error: message };
  }

  await admin
    .from("payment_transactions")
    .update({
      provider_payment_id: payResult.providerPaymentId,
      status: payResult.status,
      raw_response: payResult.raw as object,
      submitted_at: new Date().toISOString(),
      finalized_at: ["approved", "rejected", "failed", "refunded"].includes(payResult.status)
        ? new Date().toISOString()
        : null,
    })
    .eq("id", tx.id);

  let newWithdrawalStatus: "processing" | "paid" | "rejected" = "processing";
  if (payResult.status === "approved") newWithdrawalStatus = "paid";
  else if (["rejected", "failed"].includes(payResult.status))
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
    .eq("id", withdrawalId);

  await recordAudit({
    kind: newWithdrawalStatus === "paid" ? "withdrawal_paid" : "withdrawal_requested",
    actorId,
    subjectType: "withdrawals",
    subjectId: withdrawalId,
    amount: Number(withdrawal.amount),
    currency: "ARS",
    payload: {
      transaction_id: tx.id,
      provider: gateway.providerName,
      provider_payment_id: payResult.providerPaymentId,
      remote_status: payResult.status,
    },
  });

  return {
    ok: true,
    providerPaymentId: payResult.providerPaymentId,
    status: payResult.status,
    transactionId: tx.id,
  };
}
