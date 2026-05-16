"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserPlus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { enrollStudent, unenrollStudent } from "../actions";

type StudentOpt = { id: string; name: string; email: string };

export function EnrollmentManager({
  courseId,
  enrolled,
  available,
}: {
  courseId: string;
  enrolled: StudentOpt[];
  available: StudentOpt[];
}) {
  const [pickId, setPickId] = useState<string>("");
  const [pending, startTransition] = useTransition();

  function add() {
    if (!pickId) {
      toast.error("Elegí un alumno");
      return;
    }
    startTransition(async () => {
      const res = await enrollStudent(courseId, pickId);
      if ("error" in res) toast.error(res.error);
      else {
        toast.success("Alumno inscripto");
        setPickId("");
      }
    });
  }

  function remove(studentId: string) {
    startTransition(async () => {
      const res = await unenrollStudent(courseId, studentId);
      if ("error" in res) toast.error(res.error);
      else toast.success("Alumno removido");
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agregar alumno</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 flex-1 min-w-64">
            <Select
              value={pickId}
              onValueChange={(v) => setPickId(v ?? "")}
              disabled={available.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    available.length === 0
                      ? "No quedan alumnos sin inscribir"
                      : "Elegir alumno..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {available.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.email ? ` · ${s.email}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={add} disabled={pending || !pickId}>
            <UserPlus className="size-4" />
            {pending ? "Guardando..." : "Inscribir"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alumnos inscriptos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrolled.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground"
                    >
                      Nadie inscripto todavía.
                    </TableCell>
                  </TableRow>
                ) : (
                  enrolled.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.email || "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => {
                            if (!confirm(`¿Remover a ${s.name} del curso?`)) return;
                            remove(s.id);
                          }}
                        >
                          <UserMinus className="size-3.5" />
                          Remover
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
