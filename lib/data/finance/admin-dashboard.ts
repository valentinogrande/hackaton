// Aggregated queries for the admin finance dashboard.
// All data goes through the untyped finance client (database.types.ts hasn't
// been regenerated yet for 0007-0009 tables).

import { createFinanceClient } from "@/lib/finance/db";

export type SchoolFinanceRow = {
  school_id: string;
  school_name: string;
  active_period: string | null;
  pool_amount_ars: number;
  rollover_ars: number;
  active_students: number;
  avg_composite: number;
  total_distributed_ars: number;
};

export async function getFinanceOverview() {
  const supabase = await createFinanceClient();

  const [
    aumRes,
    cycleRes,
    flagsRes,
    withdrawalsRes,
    schoolsRes,
  ] = await Promise.all([
    supabase
      .from("capital_contributions")
      .select("amount_usd")
      .eq("status", "confirmed"),
    supabase
      .from("yield_cycles")
      .select("*")
      .order("period", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("compliance_flags")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("withdrawals")
      .select("*", { count: "exact", head: true })
      .in("status", ["requested", "processing"]),
    supabase.from("schools").select("id, name"),
  ]);

  const totalAumUsd = (aumRes.data ?? []).reduce(
    (acc: number, c: { amount_usd: number | string | null }) =>
      acc + Number(c.amount_usd ?? 0),
    0,
  );

  return {
    total_aum_usd: totalAumUsd,
    current_cycle: cycleRes.data,
    open_flags: flagsRes.count ?? 0,
    pending_withdrawals: withdrawalsRes.count ?? 0,
    schools_count: (schoolsRes.data ?? []).length,
  };
}

export async function getSchoolsFinance(): Promise<SchoolFinanceRow[]> {
  const supabase = await createFinanceClient();

  const { data: schools } = await supabase
    .from("schools")
    .select("id, name")
    .order("name");
  if (!schools || schools.length === 0) return [];

  type School = { id: string; name: string };

  const rows = await Promise.all(
    (schools as School[]).map(async (school): Promise<SchoolFinanceRow> => {
      const { data: activePeriod } = await supabase
        .from("payout_periods")
        .select("id, period, pool_amount, rollover_amount")
        .eq("school_id", school.id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: scores } = await supabase
        .from("student_scores")
        .select("composite, payout_amount")
        .eq("period_id", activePeriod?.id ?? "00000000-0000-0000-0000-000000000000");

      const activeStudents = (scores ?? []).filter(
        (s: { composite: number | string | null }) => Number(s.composite ?? 0) > 0,
      ).length;
      const avgComposite =
        activeStudents > 0
          ? (scores ?? []).reduce(
              (acc: number, s: { composite: number | string | null }) =>
                acc + Number(s.composite ?? 0),
              0,
            ) / activeStudents
          : 0;

      const { data: paidWithdrawals } = await supabase
        .from("withdrawals")
        .select(
          "amount, profiles!inner(id, enrollments!inner(course_id, courses!inner(school_id)))",
        )
        .eq("status", "paid")
        .eq(
          "profiles.enrollments.courses.school_id",
          school.id,
        );
      const totalDistributed = (paidWithdrawals ?? []).reduce(
        (acc: number, w: { amount: number | string }) => acc + Number(w.amount ?? 0),
        0,
      );

      return {
        school_id: school.id,
        school_name: school.name,
        active_period: activePeriod?.period ?? null,
        pool_amount_ars: Number(activePeriod?.pool_amount ?? 0),
        rollover_ars: Number(activePeriod?.rollover_amount ?? 0),
        active_students: activeStudents,
        avg_composite: avgComposite,
        total_distributed_ars: totalDistributed,
      };
    }),
  );

  return rows;
}
