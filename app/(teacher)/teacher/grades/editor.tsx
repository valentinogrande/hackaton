"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Save, BookOpen, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bulkCreateGrades } from "./actions";

type Course = { id: string; name: string; year: number };
type Subject = { id: string; name: string; course_id: string };
type Student = { id: string; full_name: string };

type Row = {
  studentId: string;
  studentName: string;
  value: string; // string for input, parsed at submit
  note: string;
};

export function GradesEditor({
  teacherId,
  initialCourses,
  initialSubjects,
}: {
  teacherId: string;
  initialCourses: Course[];
  initialSubjects: Subject[];
}) {
  const supabase = useMemo(() => createClient(), []);

  const [courseId, setCourseId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [period, setPeriod] = useState("T1");
  const [students, setStudents] = useState<Student[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [pending, startTransition] = useTransition();

  const subjectsForCourse = useMemo(
    () => initialSubjects.filter((s) => s.course_id === courseId),
    [initialSubjects, courseId]
  );

  // When course changes: reset subject + load students.
  useEffect(() => {
    if (!courseId) {
      setStudents([]);
      setRows([]);
      setSubjectId("");
      return;
    }
    setSubjectId("");
    setLoadingStudents(true);

    (async () => {
      const { data: enrolls } = await supabase
        .from("enrollments")
        .select("student_id, profiles(id, full_name)")
        .eq("course_id", courseId);

      const list: Student[] = (enrolls ?? [])
        .map((e) => e.profiles)
        .filter((p): p is { id: string; full_name: string } => !!p)
        .sort((a, b) => a.full_name.localeCompare(b.full_name));

      setStudents(list);
      setRows(
        list.map((s) => ({
          studentId: s.id,
          studentName: s.full_name || s.id.slice(0, 8),
          value: "",
          note: "",
        }))
      );
      setLoadingStudents(false);
    })();
  }, [courseId, supabase]);

  function updateRow(studentId: string, patch: Partial<Row>) {
    setRows((rs) =>
      rs.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r))
    );
  }

  function setAllValue(value: string) {
    setRows((rs) => rs.map((r) => ({ ...r, value })));
  }

  function clearAll() {
    setRows((rs) => rs.map((r) => ({ ...r, value: "", note: "" })));
  }

  const filledCount = rows.filter((r) => r.value.trim() !== "").length;

  function submit() {
    if (!subjectId) return toast.error("Elegí una materia");
    if (filledCount === 0) return toast.error("Cargá al menos una nota");

    const entries = rows
      .filter((r) => r.value.trim() !== "")
      .map((r) => ({
        studentId: r.studentId,
        value: Number(r.value),
        note: r.note,
      }));

    startTransition(async () => {
      const res = await bulkCreateGrades({
        subjectId,
        period,
        entries,
      });
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(`Se cargaron ${res.inserted} notas`);
        clearAll();
      }
    });
  }

  const selectedCourse = initialCourses.find((c) => c.id === courseId);
  const selectedSubject = subjectsForCourse.find((s) => s.id === subjectId);
  void teacherId;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Carga masiva de notas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Curso</Label>
              <Select value={courseId} onValueChange={(v) => setCourseId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegir curso..." />
                </SelectTrigger>
                <SelectContent>
                  {initialCourses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Materia</Label>
              <Select
                value={subjectId}
                onValueChange={(v) => setSubjectId(v ?? "")}
                disabled={!courseId || subjectsForCourse.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegir materia..." />
                </SelectTrigger>
                <SelectContent>
                  {subjectsForCourse.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="size-3.5" />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Período</Label>
              <Input
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="T1"
              />
            </div>
          </div>

          {selectedCourse && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{selectedCourse.name}</Badge>
              {selectedSubject && (
                <Badge variant="secondary">{selectedSubject.name}</Badge>
              )}
              <Badge variant="default">Período {period}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {courseId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-base">
                {loadingStudents
                  ? "Cargando alumnos..."
                  : `${students.length} alumno${students.length === 1 ? "" : "s"}`}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Aplicar a todos:</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  step={0.5}
                  placeholder="ej 7"
                  className="h-8 w-24"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) setAllValue(v);
                  }}
                />
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Limpiar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {students.length === 0 && !loadingStudents ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No hay alumnos enrollados en este curso.
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[45%]">Alumno</TableHead>
                      <TableHead className="w-[20%]">Nota (1-10)</TableHead>
                      <TableHead className="w-[35%]">Observación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.studentId}>
                        <TableCell className="font-medium">
                          {r.studentName}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            step={0.5}
                            placeholder="—"
                            value={r.value}
                            onChange={(e) =>
                              updateRow(r.studentId, { value: e.target.value })
                            }
                            className="h-8 w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Opcional"
                            value={r.note}
                            onChange={(e) =>
                              updateRow(r.studentId, { note: e.target.value })
                            }
                            className="h-8"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    {filledCount} de {students.length} completadas
                  </p>
                  <Button
                    onClick={submit}
                    disabled={pending || filledCount === 0 || !subjectId}
                  >
                    <Save className="size-4" />
                    {pending ? "Guardando..." : "Guardar todas"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
