"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserRole } from "./actions";
import type { Database } from "@/lib/database.types";

type Role = Database["public"]["Enums"]["user_role"];

export function RoleSelect({ userId, role }: { userId: string; role: Role }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={role}
      disabled={pending}
      onValueChange={(v) => {
        if (!v) return;
        startTransition(async () => {
          const res = await updateUserRole(userId, v as Role);
          if (res && "error" in res) toast.error(res.error);
          else toast.success("Rol actualizado");
        });
      }}
    >
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="student">Alumno</SelectItem>
        <SelectItem value="teacher">Profesor</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
      </SelectContent>
    </Select>
  );
}
