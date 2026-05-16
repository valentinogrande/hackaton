// Immutable audit logger. Every money-touching operation writes through here.

import { createFinanceAdminClient } from "@/lib/finance/db";

export type AuditKind =
  | "capital_in"
  | "fci_subscription"
  | "fci_redemption"
  | "yield_computed"
  | "yield_distributed"
  | "student_payout"
  | "investor_return"
  | "operation_expense"
  | "withdrawal_requested"
  | "withdrawal_paid"
  | "withdrawal_rejected"
  | "compliance_flag"
  | "student_hold"
  | "kyc_change";

export type AuditWrite = {
  kind: AuditKind;
  actorId?: string | null;
  subjectType: string;
  subjectId?: string | null;
  amount?: number | null;
  currency?: "ARS" | "USD" | null;
  payload?: Record<string, unknown>;
};

export async function recordAudit(event: AuditWrite) {
  const admin = createFinanceAdminClient();
  const { error } = await admin.from("audit_events").insert({
    kind: event.kind,
    actor_id: event.actorId ?? null,
    subject_type: event.subjectType,
    subject_id: event.subjectId ?? null,
    amount: event.amount ?? null,
    currency: event.currency ?? null,
    payload: event.payload ?? {},
  });
  if (error) {
    console.error("[ledger] failed to write audit_events", error);
  }
}
