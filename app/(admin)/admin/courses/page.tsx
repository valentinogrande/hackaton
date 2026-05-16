import Link from "next/link";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { CourseForm, DeleteCourseButton } from "./client";

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, name, year")
    .order("year")
    .order("name");

  // Count enrollments per course (one query, group in JS).
  const courseIds = (courses ?? []).map((c) => c.id);
  const { data: enrollRows } = courseIds.length
    ? await supabase
        .from("enrollments")
        .select("course_id")
        .in("course_id", courseIds)
    : { data: [] };

  const counts = new Map<string, number>();
  for (const r of enrollRows ?? []) {
    counts.set(r.course_id, (counts.get(r.course_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cursos</h1>

      <CourseForm />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Año</TableHead>
              <TableHead>Alumnos</TableHead>
              <TableHead className="w-48"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(courses ?? []).length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  No hay cursos todavía.
                </TableCell>
              </TableRow>
            ) : (
              (courses ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.year}</TableCell>
                  <TableCell>{counts.get(c.id) ?? 0}</TableCell>
                  <TableCell className="flex gap-1">
                    <Link
                      href={`/admin/courses/${c.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <Users className="size-3.5" />
                      Alumnos
                    </Link>
                    <DeleteCourseButton id={c.id} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
