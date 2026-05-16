"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCourse, deleteCourse } from "./actions";

export function CourseForm() {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="flex flex-wrap items-end gap-3 p-4 border rounded-md bg-card"
      action={(fd) =>
        startTransition(async () => {
          const res = await createCourse(fd);
          if (res && "error" in res) toast.error(res.error);
          else {
            toast.success("Curso creado");
            formRef.current?.reset();
          }
        })
      }
    >
      <div className="space-y-1">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" placeholder="5to A" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="year">Año</Label>
        <Input id="year" name="year" type="number" placeholder="2026" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creando..." : "Crear"}
      </Button>
    </form>
  );
}

export function DeleteCourseButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await deleteCourse(id);
          if (res && "error" in res) toast.error(res.error);
          else toast.success("Curso eliminado");
        })
      }
    >
      Eliminar
    </Button>
  );
}
