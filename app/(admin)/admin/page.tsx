import { createClient } from "@/lib/supabase/server";
import { Users, BookOpen, Layers, FileText } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";

const STAT_CONFIG = [
  {
    label: "Usuarios",
    icon: Users,
    bg: "bg-violet-50",
    iconColor: "text-violet-600",
    ring: "ring-violet-100",
  },
  {
    label: "Cursos",
    icon: BookOpen,
    bg: "bg-blue-50",
    iconColor: "text-blue-600",
    ring: "ring-blue-100",
  },
  {
    label: "Materias",
    icon: Layers,
    bg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    ring: "ring-emerald-100",
  },
  {
    label: "Materiales",
    icon: FileText,
    bg: "bg-amber-50",
    iconColor: "text-amber-600",
    ring: "ring-amber-100",
  },
];

export default async function AdminHome() {
  const supabase = await createClient();

  const [{ count: users }, { count: courses }, { count: subjects }, { count: materials }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("courses").select("*", { count: "exact", head: true }),
      supabase.from("subjects").select("*", { count: "exact", head: true }),
      supabase.from("materials").select("*", { count: "exact", head: true }),
    ]);

  const stats = [
    { ...STAT_CONFIG[0], value: users ?? 0 },
    { ...STAT_CONFIG[1], value: courses ?? 0 },
    { ...STAT_CONFIG[2], value: subjects ?? 0 },
    { ...STAT_CONFIG[3], value: materials ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-800 text-foreground">Panel de administración</h1>
        <p className="text-muted-foreground text-sm mt-1">Resumen general de la plataforma.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className={`${s.bg} ${s.ring} ring-1 rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-600 text-foreground/70">{s.label}</p>
                <div className={`size-8 rounded-xl bg-white flex items-center justify-center ${s.ring} ring-1`}>
                  <Icon className={`size-4 ${s.iconColor}`} />
                </div>
              </div>
              <p className={`text-4xl font-800 ${s.iconColor}`}>
                <AnimatedNumber value={s.value} />
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
