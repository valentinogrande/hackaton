import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/finance/api-auth";
import { runMonthlyClose } from "@/lib/finance/cycle";
import { currentPeriod } from "@/lib/finance/economy";

export async function POST(req: Request) {
  const gate = requireCronSecret(req);
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? currentPeriod();

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

// Vercel Cron always uses GET; support both.
export async function GET(req: Request) {
  return POST(req);
}
