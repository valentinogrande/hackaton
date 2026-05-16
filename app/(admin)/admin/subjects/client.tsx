"use client";

import { useRef, useTransition } from "react";
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

type Course = { id: string; name: string; year: number };
type Teacher = { id: string; full_name: string };

export function SubjectForm({
  courses,
  teachers,
}: {
  courses: Course[];
  teachers: Teacher[];
}) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="flex flex-wrap items-end gap-3 p-4 border rounded-md bg-card"
      action={(fd) =>
        startTransition(async () => {
          const res = await createSubject(fd);
          if (res && "error" in res) toast.error(res.error);
          else {
            toast.success("Materia creada");
            formRef.current?.reset();
          }
        })
      }
    >
      <div className="space-y-1">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" placeholder="Matemática" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="course_id">Curso</Label>
        <Select name="course_id" required>
          <SelectTrigger id="course_id" className="w-48">
            <SelectValue placeholder="Elegir..." />
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
        <Label htmlFor="teacher_id">Profesor</Label>
        <Select name="teacher_id" defaultValue="__none__">
          <SelectTrigger id="teacher_id" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Sin asignar —</SelectItem>
            {teachers.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.full_name || t.id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
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
  return (
    <Select
      defaultValue={teacherId ?? "__none__"}
      disabled={pending}
      onValueChange={(v) =>
        startTransition(async () => {
          const res = await setSubjectTeacher(subjectId, v === "__none__" ? null : v);
          if (res && "error" in res) toast.error(res.error);
          else toast.success("Profesor actualizado");
        })
      }
    >
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">— Sin asignar —</SelectItem>
        {teachers.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.full_name || t.id.slice(0, 8)}
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
