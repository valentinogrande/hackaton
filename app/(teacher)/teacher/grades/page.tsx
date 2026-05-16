import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GradesEditor } from "./editor";

export default async function TeacherGradesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, course_id, courses(id, name, year)")
    .eq("teacher_id", user.id);

  const courseMap = new Map<
    string,
    { id: string; name: string; year: number }
  >();
  for (const s of subjects ?? []) {
    if (s.courses && !courseMap.has(s.courses.id)) {
      courseMap.set(s.courses.id, {
        id: s.courses.id,
        name: s.courses.name,
        year: s.courses.year,
      });
    }
  }
  const courses = [...courseMap.values()].sort(
    (a, b) => a.year - b.year || a.name.localeCompare(b.name)
  );

  const flatSubjects = (subjects ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    course_id: s.course_id,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Notas</h1>
      {courses.length === 0 ? (
        <div className="rounded-md border p-4 bg-card text-sm text-muted-foreground">
          No tenés materias asignadas todavía. Pedile al admin que te asigne una
          en <code>/admin/subjects</code>.
        </div>
      ) : (
        <GradesEditor
          teacherId={user.id}
          initialCourses={courses}
          initialSubjects={flatSubjects}
        />
      )}
    </div>
  );
}
