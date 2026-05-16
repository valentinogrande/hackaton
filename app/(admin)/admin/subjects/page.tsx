import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SubjectForm, TeacherSelect, DeleteSubjectButton } from "./client";

export default async function SubjectsPage() {
  const supabase = await createClient();

  const [{ data: subjects }, { data: courses }, { data: teachers }] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, course_id, teacher_id, courses(name, year)")
      .order("name"),
    supabase.from("courses").select("id, name, year").order("year"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "teacher")
      .order("full_name"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Materias</h1>

      <SubjectForm courses={courses ?? []} teachers={teachers ?? []} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Materia</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Profesor</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(subjects ?? []).map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.name}</TableCell>
                <TableCell>
                  {s.courses ? `${s.courses.name} (${s.courses.year})` : "—"}
                </TableCell>
                <TableCell>
                  <TeacherSelect
                    subjectId={s.id}
                    teacherId={s.teacher_id}
                    teachers={teachers ?? []}
                  />
                </TableCell>
                <TableCell>
                  <DeleteSubjectButton id={s.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
