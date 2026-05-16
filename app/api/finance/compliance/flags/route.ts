import { NextResponse } from "next/server";
import { z } from "zod";
import { createFinanceAdminClient } from "@/lib/finance/db";
import { requireAdmin } from "@/lib/finance/api-auth";
import { listOpenComplianceFlags } from "@/lib/data/finance/payouts";
import { recordAudit } from "@/lib/finance/ledger";

const ResolveSchema = z.object({
  flag_id: z.uuid(),
  new_status: z.enum(["reviewed", "reported", "closed"]),
  notes: z.string().optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const flags = await listOpenComplianceFlags();
  return NextResponse.json({ flags });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const json = await req.json().catch(() => null);
  const parsed = ResolveSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const admin = createFinanceAdminClient();
  const { error } = await admin
    .from("compliance_flags")
    .update({
      status: parsed.data.new_status,
      resolved_by: auth.actor.userId,
      resolved_at: new Date().toISOString(),
      resolution_notes: parsed.data.notes ?? null,
    })
    .eq("id", parsed.data.flag_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    kind: "compliance_flag",
    actorId: auth.actor.userId,
    subjectType: "compliance_flags",
    subjectId: parsed.data.flag_id,
    payload: { new_status: parsed.data.new_status, notes: parsed.data.notes },
  });

  return NextResponse.json({ ok: true });
}
