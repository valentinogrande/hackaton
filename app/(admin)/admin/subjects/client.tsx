"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
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
import { createSubject, setSubjectTeacher, deleteSubject } from "./actions";
import { userDisplayName } from "@/lib/utils/user";

type Course = { id: string; name: string; year: number };
type Teacher = { id: string; full_name: string; email: string | null };

const NONE = "__none__";

export function SubjectForm({
  courses,
  teachers,
}: {
  courses: Course[];
  teachers: Teacher[];
}) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [courseId, setCourseId] = useState<string>("");
  const [teacherId, setTeacherId] = useState<string>(NONE);

  const courseLabel = (id: string) => {
    const c = courses.find((x) => x.id === id);
    return c ? `${c.name} (${c.year})` : "Elegir...";
  };
  const teacherLabel = (id: string) => {
    if (id === NONE) return "— Sin asignar —";
    const t = teachers.find((x) => x.id === id);
    return t ? userDisplayName(t) : "Elegir...";
  };

  return (
    <form
      ref={formRef}
      className="flex flex-wrap items-end gap-3 p-4 border rounded-md bg-card"
      action={(fd) =>
        startTransition(async () => {
          // Inject controlled values since base-ui Select doesn't auto-submit hidden state.
          fd.set("course_id", courseId);
          fd.set("teacher_id", teacherId);
          const res = await createSubject(fd);
          if (res && "error" in res) toast.error(res.error);
          else {
            toast.success("Materia creada");
            formRef.current?.reset();
            setCourseId("");
            setTeacherId(NONE);
          }
        })
      }
    >
      <div className="space-y-1">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" placeholder="Matemática" required />
      </div>
      <div className="space-y-1">
        <Label>Curso</Label>
        <Select value={courseId} onValueChange={(v) => setCourseId(v ?? "")}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Elegir curso...">
              {courseId ? courseLabel(courseId) : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.year})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Profesor</Label>
        <Select value={teacherId} onValueChange={(v) => setTeacherId(v ?? NONE)}>
          <SelectTrigger className="w-56">
            <SelectValue>{teacherLabel(teacherId)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Sin asignar —</SelectItem>
            {teachers.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {userDisplayName(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending || !courseId}>
        {pending ? "Creando..." : "Crear"}
      </Button>
    </form>
  );
}

export function TeacherSelect({
  subjectId,
  teacherId,
  teachers,
}: {
  subjectId: string;
  teacherId: string | null;
  teachers: Teacher[];
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<string>(teacherId ?? NONE);

  const label = (id: string) => {
    if (id === NONE) return "— Sin asignar —";
    const t = teachers.find((x) => x.id === id);
    return t ? userDisplayName(t) : "Profesor no listado";
  };

  return (
    <Select
      value={value}
      disabled={pending}
      onValueChange={(v) => {
        const next = v ?? NONE;
        setValue(next);
        startTransition(async () => {
          const res = await setSubjectTeacher(
            subjectId,
            next === NONE ? null : next
          );
          if (res && "error" in res) toast.error(res.error);
          else toast.success("Profesor actualizado");
        });
      }}
    >
      <SelectTrigger className="w-56">
        <SelectValue>{label(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>— Sin asignar —</SelectItem>
        {teachers.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {userDisplayName(t)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DeleteSubjectButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await deleteSubject(id);
          if (res && "error" in res) toast.error(res.error);
          else toast.success("Eliminada");
        })
      }
    >
      Eliminar
    </Button>
  );
}
