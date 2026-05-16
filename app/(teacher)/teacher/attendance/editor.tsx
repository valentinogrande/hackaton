"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Save, BookOpen, CalendarDays } from "lucide-react";
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
import { markAttendance } from "./actions";
import type { Database } from "@/lib/database.types";

type Status = Database["public"]["Enums"]["attendance_status"];
type Course = { id: string; name: string; year: number };
type Subject = { id: string; name: string; course_id: string };
type Student = { id: string; full_name: string };

type Row = {
  studentId: string;
  studentName: string;
  status: Status | null;
};

const STATUS_LABEL: Record<Status, string> = {
  present: "Presente",
  late: "Tarde",
  absent: "Ausente",
};

const STATUS_COLOR: Record<Status, string> = {
  present: "bg-emerald-500/10 border-emerald-500/60 text-emerald-700",
  late: "bg-amber-500/10 border-amber-500/60 text-amber-700",
  absent: "bg-red-500/10 border-red-500/60 text-red-700",
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceEditor({
  initialCourses,
  initialSubjects,
}: {
  initialCourses: Course[];
  initialSubjects: Subject[];
}) {
  const supabase = useMemo(() => createClient(), []);

  const [courseId, setCourseId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [date, setDate] = useState(todayIsoDate());
  const [students, setStudents] = useState<Student[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [pending, startTransition] = useTransition();

  const subjectsForCourse = useMemo(
    () => initialSubjects.filter((s) => s.course_id === courseId),
    [initialSubjects, courseId]
  );

  // Load students when course changes.
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
          status: null,
        }))
      );
      setLoadingStudents(false);
    })();
  }, [courseId, supabase]);

  // Pre-fill from existing attendance once subject + date are set.
  useEffect(() => {
    if (!subjectId || !date || students.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("attendance")
        .select("student_id, status")
        .eq("subject_id", subjectId)
        .eq("date", date);

      const byStudent = new Map<string, Status>();
      for (const r of data ?? []) {
        byStudent.set(r.student_id, r.status);
      }
      setRows((rs) =>
        rs.map((r) => ({
          ...r,
          status: byStudent.get(r.studentId) ?? r.status,
        }))
      );
    })();
  }, [subjectId, date, students.length, supabase]);

  function setRowStatus(studentId: string, status: Status) {
    setRows((rs) =>
      rs.map((r) => (r.studentId === studentId ? { ...r, status } : r))
    );
  }

  function setAll(status: Status) {
    setRows((rs) => rs.map((r) => ({ ...r, status })));
  }

  function clearAll() {
    setRows((rs) => rs.map((r) => ({ ...r, status: null })));
  }

  const filledCount = rows.filter((r) => r.status !== null).length;

  function submit() {
    if (!subjectId) return toast.error("Elegí una materia");
    if (!date) return toast.error("Elegí una fecha");
    if (filledCount === 0) return toast.error("Marcá al menos un alumno");

    const entries = rows
      .filter((r) => r.status !== null)
      .map((r) => ({ studentId: r.studentId, status: r.status as Status }));

    startTransition(async () => {
      const res = await markAttendance({ subjectId, date, entries });
      if (res && "error" in res) {
        toast.error(res.error);
      } else {
        toast.success(`Asistencia guardada (${entries.length} alumno${entries.length === 1 ? "" : "s"})`);
      }
    });
  }

  const selectedCourse = initialCourses.find((c) => c.id === courseId);
  const selectedSubject = subjectsForCourse.find((s) => s.id === subjectId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="size-5" />
            Tomar asistencia
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
              <Label>Fecha</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {selectedCourse && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{selectedCourse.name}</Badge>
              {selectedSubject && (
                <Badge variant="secondary">{selectedSubject.name}</Badge>
              )}
              <Badge variant="default">{date}</Badge>
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
                <Label className="text-xs">Marcar a todos:</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAll("present")}
                >
                  Presente
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAll("late")}
                >
                  Tarde
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAll("absent")}
                >
                  Ausente
                </Button>
                <Button size="sm" variant="ghost" onClick={clearAll}>
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
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.studentId}>
                        <TableCell className="font-medium">
                          {r.studentName}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {(
                              ["present", "late", "absent"] as Status[]
                            ).map((s) => {
                              const active = r.status === s;
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setRowStatus(r.studentId, s)}
                                  className={[
                                    "px-3 py-1 rounded-md border text-xs transition-all",
                                    active
                                      ? STATUS_COLOR[s]
                                      : "border-border hover:bg-accent",
                                  ].join(" ")}
                                >
                                  {STATUS_LABEL[s]}
                                </button>
                              );
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    {filledCount} de {students.length} marcados
                  </p>
                  <Button
                    onClick={submit}
                    disabled={pending || filledCount === 0 || !subjectId}
                  >
                    <Save className="size-4" />
                    {pending ? "Guardando..." : "Guardar asistencia"}
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
