"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/database.types";
import {
  Home,
  Users,
  BookOpen,
  Layers,
  Landmark,
  FileText,
  ClipboardList,
  CalendarCheck,
  Brain,
  CalendarDays,
  Wallet,
  BarChart2,
  GraduationCap,
  LogOut,
} from "lucide-react";

type Role = Database["public"]["Enums"]["user_role"];

const LINKS: Record<Role, { href: string; label: string; icon: React.ElementType }[]> = {
  admin: [
    { href: "/admin", label: "Inicio", icon: Home },
    { href: "/admin/users", label: "Usuarios", icon: Users },
    { href: "/admin/courses", label: "Cursos", icon: BookOpen },
    { href: "/admin/subjects", label: "Materias", icon: Layers },
    { href: "/admin/payouts", label: "Pools / Retiros", icon: Landmark },
  ],
  teacher: [
    { href: "/teacher", label: "Inicio", icon: Home },
    { href: "/teacher/materials", label: "Materiales", icon: FileText },
    { href: "/teacher/grades", label: "Notas", icon: ClipboardList },
    { href: "/teacher/attendance", label: "Asistencia", icon: CalendarCheck },
    { href: "/teacher/pool", label: "Mi pool", icon: BarChart2 },
  ],
  student: [
    { href: "/student", label: "Inicio", icon: Home },
    { href: "/student/estudiar", label: "Estudiar", icon: Brain },
    { href: "/student/notas", label: "Notas", icon: ClipboardList },
    { href: "/student/asistencia", label: "Asistencia", icon: CalendarDays },
    { href: "/student/wallet", label: "Billetera", icon: Wallet },
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  teacher: "Profesor",
  student: "Estudiante",
};

export function RoleNav({ role, fullName }: { role: Role; fullName: string }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === `/${role}`
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <aside className="w-60 shrink-0 flex flex-col" style={{ background: "var(--sidebar)" }}>
      {/* Logo */}
      <div className="px-5 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-white/20 flex items-center justify-center">
            <GraduationCap className="size-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-800 text-white tracking-tight">StudyPay</p>
            <p className="text-[11px] text-white/50 font-500">{ROLE_LABELS[role]}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {LINKS[role].map((l) => {
          const Icon = l.icon;
          const active = isActive(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-500 transition-colors duration-150",
                active
                  ? "bg-white/15 text-white font-600"
                  : "text-white/70 hover:bg-white/8 hover:text-white",
              ].join(" ")}
            >
              <Icon className="size-4 shrink-0" />
              {l.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 mb-2.5">
          <div className="size-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-700 text-white shrink-0">
            {fullName ? fullName[0].toUpperCase() : "?"}
          </div>
          <p className="text-xs text-white/60 truncate flex-1">{fullName || "—"}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/8 transition-colors duration-150"
          >
            <LogOut className="size-4" />
            Salir
          </button>
        </form>
      </div>
    </aside>
  );
}
