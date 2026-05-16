import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { userDisplayName } from "@/lib/utils/user";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnrollmentManager } from "./client";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, name, year, schools(name)")
    .eq("id", courseId)
    .single();
  if (!course) notFound();

  const [{ data: enrolled }, { data: allStudents }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("student_id, profiles(id, full_name, email)")
      .eq("course_id", courseId),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "student")
      .order("full_name"),
  ]);

  const enrolledList = (enrolled ?? [])
    .map((e) => e.profiles)
    .filter((p): p is { id: string; full_name: string; email: string | null } => !!p)
    .map((p) => ({ id: p.id, name: userDisplayName(p), email: p.email ?? "" }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const enrolledIds = new Set(enrolledList.map((s) => s.id));
  const available = (allStudents ?? [])
    .filter((s) => !enrolledIds.has(s.id))
    .map((s) => ({ id: s.id, name: userDisplayName(s), email: s.email ?? "" }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/courses"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-4" />
          Cursos
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {course.name}{" "}
            <span className="text-base font-normal text-muted-foreground">
              ({course.year})
            </span>
          </CardTitle>
          {course.schools?.name && (
            <p className="text-sm text-muted-foreground">{course.schools.name}</p>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {enrolledList.length} alumno{enrolledList.length === 1 ? "" : "s"} inscripto
            {enrolledList.length === 1 ? "" : "s"}
          </p>
        </CardContent>
      </Card>

      <EnrollmentManager
        courseId={courseId}
        enrolled={enrolledList}
        available={available}
      />
    </div>
  );
}
