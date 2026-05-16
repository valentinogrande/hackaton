import { createClient } from "@/lib/supabase/server";

export async function getCurrentPeriodForSchool(schoolId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payout_periods")
    .select("*")
    .eq("school_id", schoolId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getStudentScoreForPeriod(
  studentId: string,
  periodId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_scores")
    .select("*")
    .eq("student_id", studentId)
    .eq("period_id", periodId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDemoSchoolId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schools")
    .select("id")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

// Returns YYYY-MM for the current month in UTC, matching how recompute_pools_v2
// derives the period start.
export function currentPeriodKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodBounds(period: string): { start: Date; end: Date } {
  const start = new Date(`${period}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}

// Live stats from the source of truth (grades + points_ledger), regardless of
// whether the admin has run recompute_pools_v2. If a student_scores snapshot
// exists for the active period, we return its payout_amount too.
export type StudentPeriodStats = {
  period: string;
  gradeAvg: number;
  studyPoints: number;
  composite: number;
  payoutAmount: number | null;
  hasRecompute: boolean;
};

export async function getStudentLivePeriodStats(
  studentId: string,
  period: string,
  periodId?: string | null
): Promise<StudentPeriodStats> {
  const supabase = await createClient();
  const { start, end } = periodBounds(period);

  const [gradesRes, ledgerRes, snapshotRes] = await Promise.all([
    supabase
      .from("grades")
      .select("value")
      .eq("student_id", studentId)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString()),
    supabase
      .from("points_ledger")
      .select("delta")
      .eq("student_id", studentId)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString()),
    periodId
      ? supabase
          .from("student_scores")
          .select("payout_amount, composite")
          .eq("student_id", studentId)
          .eq("period_id", periodId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const grades = gradesRes.data ?? [];
  const ledger = ledgerRes.data ?? [];
  const snapshot = snapshotRes.data;

  const gradeAvg =
    grades.length > 0
      ? grades.reduce((s, g) => s + Number(g.value), 0) / grades.length
      : 0;
  const studyPoints = ledger.reduce((s, l) => s + Number(l.delta), 0);

  // Same formula as recompute_pools_v2 so the preview matches what they'd cobrar.
  const composite =
    snapshot && Number(snapshot.composite) > 0
      ? Number(snapshot.composite)
      : gradeAvg / 10 + Math.min(studyPoints, 500) / 500;

  return {
    period,
    gradeAvg,
    studyPoints,
    composite,
    payoutAmount: snapshot ? Number(snapshot.payout_amount) : null,
    hasRecompute: !!snapshot,
  };
}
