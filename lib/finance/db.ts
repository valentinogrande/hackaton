// Untyped Supabase clients for the finance module.
// The finance tables (capital_sources, yield_cycles, payment_transactions, ...)
// are not yet in lib/database.types.ts because that file is regenerated from
// the live DB schema. Once the 0007-0009 migrations are applied and types are
// regenerated (`npx supabase gen types ...`), these wrappers can be removed
// and finance code can import from `@/lib/supabase/server` like everything else.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createAdminSb } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

export function createFinanceAdminClient() {
  return createAdminSb<AnyDb>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function createFinanceClient() {
  const cookieStore = await cookies();
  return createServerClient<AnyDb>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware handles refresh.
          }
        },
      },
    },
  );
}
