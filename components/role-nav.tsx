import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/database.types";

type Role = Database["public"]["Enums"]["user_role"];

const LINKS: Record<Role, { href: string; label: string }[]> = {
  admin: [
    { href: "/admin", label: "Inicio" },
    { href: "/admin/users", label: "Usuarios" },
    { href: "/admin/courses", label: "Cursos" },
    { href: "/admin/subjects", label: "Materias" },
  ],
  teacher: [
    { href: "/teacher", label: "Inicio" },
    { href: "/teacher/materials", label: "Materiales" },
    { href: "/teacher/grades", label: "Notas" },
    { href: "/teacher/attendance", label: "Asistencia" },
  ],
  student: [
    { href: "/student", label: "Inicio" },
    { href: "/student/estudiar", label: "Estudiar" },
    { href: "/student/notas", label: "Notas" },
    { href: "/student/asistencia", label: "Asistencia" },
  ],
};

export function RoleNav({ role, fullName }: { role: Role; fullName: string }) {
  return (
    <aside className="w-56 shrink-0 border-r bg-card flex flex-col">
      <div className="px-4 py-5 border-b">
        <p className="text-sm font-semibold">StudyPay</p>
        <p className="text-xs text-muted-foreground capitalize">{role}</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {LINKS[role].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="block px-3 py-2 rounded-md text-sm hover:bg-accent"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t space-y-2">
        <p className="text-xs text-muted-foreground truncate">{fullName || "—"}</p>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm" className="w-full">
            Salir
          </Button>
        </form>
      </div>
    </aside>
  );
}
