"use client";

import { useState, useTransition } from "react";
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

const ROLE_LABEL: Record<Role, string> = {
  student: "Alumno",
  teacher: "Profesor",
  admin: "Admin",
};

export function RoleSelect({ userId, role }: { userId: string; role: Role }) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<Role>(role);

  return (
    <Select
      value={value}
      disabled={pending}
      onValueChange={(v) => {
        if (!v) return;
        const next = v as Role;
        setValue(next);
        startTransition(async () => {
          const res = await updateUserRole(userId, next);
          if (res && "error" in res) toast.error(res.error);
          else toast.success("Rol actualizado");
        });
      }}
    >
      <SelectTrigger className="w-32">
        <SelectValue>{ROLE_LABEL[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="student">Alumno</SelectItem>
        <SelectItem value="teacher">Profesor</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
      </SelectContent>
    </Select>
  );
}
