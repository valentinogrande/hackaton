"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type Status = Database["public"]["Enums"]["attendance_status"];

export async function markAttendance(args: {
  subjectId: string;
  date: string; // YYYY-MM-DD
  entries: { studentId: string; status: Status }[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const rows = args.entries.map((e) => ({
    student_id: e.studentId,
    subject_id: args.subjectId,
    date: args.date,
    status: e.status,
    created_by: user.id,
  }));

  const { error } = await supabase
    .from("attendance")
    .upsert(rows, { onConflict: "student_id,subject_id,date" });
  if (error) return { error: error.message };

  revalidatePath("/teacher/attendance");
  return { ok: true as const };
}
