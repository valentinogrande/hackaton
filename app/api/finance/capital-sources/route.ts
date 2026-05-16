import { NextResponse } from "next/server";
import { z } from "zod";
import { createFinanceAdminClient } from "@/lib/finance/db";
import { requireAdmin } from "@/lib/finance/api-auth";
import { recordAudit } from "@/lib/finance/ledger";
import { gafiRisk } from "@/lib/finance/compliance";
import { listCapitalSources } from "@/lib/data/finance/capital";

const CreateSchema = z.object({
  kind: z.enum(["government", "private_individual", "private_corporate", "impact_fund"]),
  display_name: z.string().min(2),
  legal_name: z.string().optional(),
  tax_id: z.string().optional(),
  country_code: z.string().length(2).default("AR"),
  contact: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const sources = await listCapitalSources();
  return NextResponse.json({ sources });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const json = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const admin = createFinanceAdminClient();
  const { data, error } = await admin
    .from("capital_sources")
    .insert({
      kind: parsed.data.kind,
      display_name: parsed.data.display_name,
      legal_name: parsed.data.legal_name ?? null,
      tax_id: parsed.data.tax_id ?? null,
      country_code: parsed.data.country_code.toUpperCase(),
      contact: parsed.data.contact ?? {},
      notes: parsed.data.notes ?? null,
    })
    .select("*")
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message }, { status: 500 });

  const risk = gafiRisk(parsed.data.country_code);
  if (risk !== "ok") {
    await admin.from("compliance_flags").insert({
      kind: "gafi_jurisdiction",
      severity: risk === "black" ? "high" : "medium",
      subject_type: "capital_sources",
      subject_id: data.id,
      payload: { country_code: parsed.data.country_code, risk },
    });
  }

  await recordAudit({
    kind: "kyc_change",
    actorId: auth.actor.userId,
    subjectType: "capital_sources",
    subjectId: data.id,
    payload: { action: "created", kind: parsed.data.kind },
  });

  return NextResponse.json({ source: data }, { status: 201 });
}
