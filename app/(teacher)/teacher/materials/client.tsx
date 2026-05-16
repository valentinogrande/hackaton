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
import {
  uploadMaterial,
  deleteMaterial,
  getMaterialSignedUrl,
} from "./actions";

type Subject = {
  id: string;
  name: string;
  courses: { name: string; year: number } | null;
};

export function UploadMaterialForm({ subjects }: { subjects: Subject[] }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="flex flex-wrap items-end gap-3 p-4 border rounded-md bg-card"
      action={(fd) =>
        startTransition(async () => {
          const res = await uploadMaterial(fd);
          if (res && "error" in res) {
            toast.error(res.error);
          } else {
            toast.success("Material subido");
            formRef.current?.reset();
          }
        })
      }
    >
      <div className="space-y-1">
        <Label htmlFor="subject_id">Materia</Label>
        <Select name="subject_id" required>
          <SelectTrigger id="subject_id" className="w-56">
            <SelectValue placeholder="Elegir..." />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
                {s.courses ? ` — ${s.courses.name}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          placeholder="Capítulo 5: Funciones"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="file">PDF</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept="application/pdf"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Subiendo..." : "Subir"}
      </Button>
    </form>
  );
}

export function ViewPdfButton({ path }: { path: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const url = await getMaterialSignedUrl(path);
        setLoading(false);
        if (url) window.open(url, "_blank");
        else toast.error("No se pudo abrir el PDF");
      }}
    >
      Ver
    </Button>
  );
}

export function DeleteMaterialButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (!confirm("¿Eliminar este material?")) return;
          const res = await deleteMaterial(id);
          if (res && "error" in res) toast.error(res.error);
          else toast.success("Material eliminado");
        })
      }
    >
      Eliminar
    </Button>
  );
}
