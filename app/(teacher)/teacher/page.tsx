import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FileText, ClipboardList, CalendarCheck, ArrowRight } from "lucide-react";

const QUICK_ACTIONS = [
  {
    href: "/teacher/materials",
    label: "Materiales",
    desc: "Subí PDFs por materia para que los alumnos estudien",
    icon: FileText,
    bg: "bg-violet-50",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    ring: "ring-violet-100",
  },
  {
    href: "/teacher/grades",
    label: "Notas",
    desc: "Cargá las calificaciones de tus alumnos",
    icon: ClipboardList,
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    ring: "ring-blue-100",
  },
  {
    href: "/teacher/attendance",
    label: "Asistencia",
    desc: "Pasá asistencia de la clase de hoy",
    icon: CalendarCheck,
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    ring: "ring-emerald-100",
  },
];

export default async function TeacherHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const firstName = profile?.full_name?.split(" ")[0] || "profe";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-800">
          Hola,{" "}
          <span className="bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent">
            {firstName}
          </span>{" "}
          👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Panel del profesor — StudyPay.</p>
      </div>

      <div>
        <h2 className="text-base font-700 text-foreground mb-3">Acciones</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className={`${a.bg} ${a.ring} ring-1 rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md group`}
              >
                <div className="flex items-center justify-between">
                  <div className={`size-10 rounded-xl ${a.iconBg} flex items-center justify-center`}>
                    <Icon className={`size-5 ${a.iconColor}`} />
                  </div>
                  <ArrowRight className="size-4 text-foreground/30 group-hover:text-foreground/60 transition-colors" />
                </div>
                <div>
                  <p className="text-base font-700 text-foreground">{a.label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{a.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
