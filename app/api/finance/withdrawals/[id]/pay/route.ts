import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/finance/api-auth";
import { processWithdrawal } from "@/lib/finance/payments";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const result = await processWithdrawal(id, auth.actor.userId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
