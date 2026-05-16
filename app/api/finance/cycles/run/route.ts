import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/finance/api-auth";
import { runMonthlyClose } from "@/lib/finance/cycle";
import { currentPeriod } from "@/lib/finance/economy";

const Schema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const json = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const period = parsed.data.period ?? currentPeriod();

  try {
    const result = await runMonthlyClose(period);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
