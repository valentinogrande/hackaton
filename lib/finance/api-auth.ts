// Auth helpers for finance API routes.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type ApiActor = { userId: string };

export async function requireAdmin(): Promise<
  { ok: true; actor: ApiActor } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "no auth" }, { status: 401 }),
    };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, actor: { userId: user.id } };
}

export function requireCronSecret(req: Request):
  | { ok: true }
  | { ok: false; response: NextResponse } {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 500 },
      ),
    };
  }
  const provided = req.headers.get("x-cron-secret");
  if (provided !== expected) {
    return {
      ok: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }
  return { ok: true };
}
