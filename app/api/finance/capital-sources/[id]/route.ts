import { NextResponse } from "next/server";
import { z } from "zod";
import { createFinanceAdminClient } from "@/lib/finance/db";
import { requireAdmin } from "@/lib/finance/api-auth";
import { recordAudit } from "@/lib/finance/ledger";

const PatchSchema = z.object({
  kyc_status: z.enum(["pending", "approved", "rejected", "expired"]).optional(),
  kyc_documents: z.record(z.string(), z.unknown()).optional(),
  gafi_check_passed: z.boolean().optional(),
  contact: z.record(z.string(), z.unknown()).optional(),
  legal_name: z.string().optional(),
  tax_id: z.string().optional(),
  active: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const admin = createFinanceAdminClient();
  const patch: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.kyc_status === "approved") {
    patch.approved_at = new Date().toISOString();
  }

  const { data, error } = await admin
    .from("capital_sources")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message }, { status: 500 });

  await recordAudit({
    kind: "kyc_change",
    actorId: auth.actor.userId,
    subjectType: "capital_sources",
    subjectId: id,
    payload: { action: "updated", changes: parsed.data },
  });

  return NextResponse.json({ source: data });
}
