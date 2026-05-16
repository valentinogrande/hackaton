import { createClient } from "@/lib/supabase/server";
import { userDisplayName } from "@/lib/utils/user";

export type PayoutBreakdownRow = {
  teacher_id: string;
  teacher_name: string;
  course_id: string;
  course_name: string;
  grade_avg: number;
  study_points: number;
  composite: number;
  amount: number;
  rank: number | null;
};

export async function getStudentPayoutBreakdown(
  studentId: string,
  periodId: string
): Promise<PayoutBreakdownRow[]> {
  const supabase = await createClient();

  // Snapshot from the last recompute, if any.
  const { data: snapshot, error: sErr } = await supabase
    .from("student_payouts")
    .select(
      "teacher_id, course_id, grade_avg, study_points, composite, amount, rank, profiles!student_payouts_teacher_id_fkey(full_name, email), courses(name)"
    )
    .eq("student_id", studentId)
    .eq("period_id", periodId)
    .order("amount", { ascending: false });
  if (sErr) throw sErr;

  if (snapshot && snapshot.length > 0) {
    return snapshot.map((r) => {
      const teacher = r.profiles as { full_name: string; email: string | null } | null;
      return {
        teacher_id: r.teacher_id,
        teacher_name: userDisplayName({
          full_name: teacher?.full_name,
          email: teacher?.email,
          id: r.teacher_id,
        }),
        course_id: r.course_id,
        course_name: (r.courses as { name: string } | null)?.name ?? "—",
        grade_avg: Number(r.grade_avg),
        study_points: r.study_points,
        composite: Number(r.composite),
        amount: Number(r.amount),
        rank: r.rank,
      };
    });
  }

  // No snapshot yet — compute live using the SQL helper.
  const { data: live, error: lErr } = await supabase.rpc("preview_student_payouts", {
    p_student_id: studentId,
    p_period_id: periodId,
  });
  if (lErr) throw lErr;
  if (!live || live.length === 0) return [];

  // Hydrate teacher + course names in a single follow-up query.
  const teacherIds = [...new Set(live.map((r) => r.teacher_id))];
  const courseIds = [...new Set(live.map((r) => r.course_id))];
  const [{ data: teachers }, { data: courses }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", teacherIds),
    supabase.from("courses").select("id, name").in("id", courseIds),
  ]);
  const teacherMap = new Map((teachers ?? []).map((t) => [t.id, t]));
  const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));

  return live.map((r) => {
    const t = teacherMap.get(r.teacher_id);
    return {
      teacher_id: r.teacher_id,
      teacher_name: userDisplayName({
        full_name: t?.full_name,
        email: t?.email,
        id: r.teacher_id,
      }),
      course_id: r.course_id,
      course_name: courseMap.get(r.course_id)?.name ?? "—",
      grade_avg: Number(r.grade_avg),
      study_points: r.study_points,
      composite: Number(r.composite),
      amount: Number(r.amount),
      rank: r.rank,
    };
  });
}

export type TeacherPoolDetail = {
  pool_amount: number;
  teacher_bonus: number;
  by_course: {
    course_id: string;
    course_name: string;
    course_year: number;
    leaderboard: {
      student_id: string;
      student_name: string;
      grade_avg: number;
      study_points: number;
      composite: number;
      amount: number;
      rank: number | null;
    }[];
  }[];
};

export async function getTeacherPoolDetail(
  teacherId: string,
  periodId: string
): Promise<TeacherPoolDetail | null> {
  const supabase = await createClient();

  const { data: pool } = await supabase
    .from("teacher_pools")
    .select("pool_amount, teacher_bonus")
    .eq("teacher_id", teacherId)
    .eq("period_id", periodId)
    .maybeSingle();

  const { data: rows, error } = await supabase
    .from("student_payouts")
    .select(
      "student_id, course_id, grade_avg, study_points, composite, amount, rank, profiles!student_payouts_student_id_fkey(full_name, email), courses(name, year)"
    )
    .eq("teacher_id", teacherId)
    .eq("period_id", periodId)
    .order("rank", { ascending: true });
  if (error) throw error;

  const byCourse = new Map<
    string,
    {
      course_id: string;
      course_name: string;
      course_year: number;
      leaderboard: TeacherPoolDetail["by_course"][number]["leaderboard"];
    }
  >();

  for (const r of rows ?? []) {
    const cId = r.course_id;
    const c = r.courses as { name: string; year: number } | null;
    const p = r.profiles as { full_name: string; email: string | null } | null;
    if (!byCourse.has(cId)) {
      byCourse.set(cId, {
        course_id: cId,
        course_name: c?.name ?? "—",
        course_year: c?.year ?? 0,
        leaderboard: [],
      });
    }
    byCourse.get(cId)!.leaderboard.push({
      student_id: r.student_id,
      student_name: userDisplayName({
        full_name: p?.full_name,
        email: p?.email,
        id: r.student_id,
      }),
      grade_avg: Number(r.grade_avg),
      study_points: r.study_points,
      composite: Number(r.composite),
      amount: Number(r.amount),
      rank: r.rank,
    });
  }

  return {
    pool_amount: Number(pool?.pool_amount ?? 0),
    teacher_bonus: Number(pool?.teacher_bonus ?? 0),
    by_course: [...byCourse.values()].sort(
      (a, b) => a.course_year - b.course_year || a.course_name.localeCompare(b.course_name)
    ),
  };
}

export async function listAllTeacherPools(periodId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teacher_pools")
    .select(
      "teacher_id, pool_amount, teacher_bonus, profiles(full_name, email)"
    )
    .eq("period_id", periodId)
    .order("pool_amount", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const p = r.profiles as { full_name: string; email: string | null } | null;
    return {
      teacher_id: r.teacher_id,
      teacher_name: userDisplayName({
        full_name: p?.full_name,
        email: p?.email,
        id: r.teacher_id,
      }),
      pool_amount: Number(r.pool_amount),
      teacher_bonus: Number(r.teacher_bonus),
    };
  });
}
