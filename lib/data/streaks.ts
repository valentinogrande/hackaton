import { createClient } from "@/lib/supabase/server";

const MAX_LOOKBACK_DAYS = 60;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Counts consecutive days (ending today) where the student earned points.
// Today always counts as the start because the student is doing something right now
// (and the streak is queried during answerQuestion / page load).
export async function computeCurrentStreak(studentId: string): Promise<number> {
  const supabase = await createClient();

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - MAX_LOOKBACK_DAYS);

  const { data } = await supabase
    .from("points_ledger")
    .select("created_at")
    .eq("student_id", studentId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  const daysWithActivity = new Set<string>();
  for (const row of data ?? []) {
    daysWithActivity.add(row.created_at.slice(0, 10));
  }

  const today = new Date();
  const todayIso = ymd(today);
  const hasActivityToday = daysWithActivity.has(todayIso);

  // Day 0 = today (always counts if answering now, even if first answer of the day).
  // From day 1 backward, we require an actual entry.
  let streak = hasActivityToday ? 1 : 1; // first answer of the day still counts as day 1
  for (let i = 1; i < MAX_LOOKBACK_DAYS; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    if (daysWithActivity.has(ymd(d))) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// Same as above but treats "today" honestly — only counts it if the ledger has an
// entry today. Useful for the home card where we don't want to show "1 day" if
// the student hasn't studied yet today.
export async function readCurrentStreak(studentId: string): Promise<number> {
  const supabase = await createClient();

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - MAX_LOOKBACK_DAYS);

  const { data } = await supabase
    .from("points_ledger")
    .select("created_at")
    .eq("student_id", studentId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  const daysWithActivity = new Set<string>();
  for (const row of data ?? []) {
    daysWithActivity.add(row.created_at.slice(0, 10));
  }

  const today = new Date();
  let streak = 0;
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    if (daysWithActivity.has(ymd(d))) {
      streak++;
    } else if (i > 0) {
      break;
    }
    // If today has no activity yet, keep checking yesterday — but the count starts at 0.
  }
  return streak;
}
