import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recomputeScores } from "@/app/(admin)/admin/payouts/actions";

// POST /api/tokens/recompute   { periodId }
// Admin only. Optionally callable from a cron job (Vercel Cron).
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no auth" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { periodId } = (await req.json()) as { periodId?: string };
  if (!periodId) return NextResponse.json({ error: "periodId required" }, { status: 400 });

  const res = await recomputeScores(periodId);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
