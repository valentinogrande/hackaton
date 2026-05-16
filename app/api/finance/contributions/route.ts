import { NextResponse } from "next/server";
import { z } from "zod";
import { createFinanceAdminClient } from "@/lib/finance/db";
import { requireAdmin } from "@/lib/finance/api-auth";

const CreateSchema = z.object({
  source_id: z.uuid(),
  amount: z.number().positive(),
  currency: z.enum(["ARS", "USD"]),
  transfer_hash: z.string().optional(),
  received_at: z.string().datetime().optional(),
  notes: z.string().optional(),
});

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
    .from("capital_contributions")
    .insert({
      source_id: parsed.data.source_id,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      transfer_hash: parsed.data.transfer_hash ?? null,
      received_at: parsed.data.received_at ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select("*")
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message }, { status: 500 });

  return NextResponse.json({ contribution: data }, { status: 201 });
}
