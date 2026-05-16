"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
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
import { createUser } from "./actions";

export function CreateUserForm() {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
      action={(fd) =>
        startTransition(async () => {
          const res = await createUser(fd);
          if (res && "error" in res) {
            toast.error(res.error);
          } else {
            toast.success("Cuenta creada");
            formRef.current?.reset();
          }
        })
      }
    >
      <div className="space-y-1">
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input id="full_name" name="full_name" placeholder="Juan Pérez" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="juan@studypay.test"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="text"
          placeholder="mínimo 4 chars"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="role">Rol</Label>
        <Select name="role" defaultValue="student">
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="student">Alumno</SelectItem>
            <SelectItem value="teacher">Profesor</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        <UserPlus className="size-4" />
        {pending ? "Creando..." : "Crear"}
      </Button>
    </form>
  );
}
