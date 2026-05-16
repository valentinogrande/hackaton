import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Brain, ClipboardList, CalendarDays, Wallet, ArrowRight } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";

const QUICK_ACTIONS = [
  {
    href: "/student/estudiar",
    label: "Estudiar",
    desc: "Sesiones con IA y quizzes",
    icon: Brain,
    bg: "bg-violet-50",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    ring: "ring-violet-100",
  },
  {
    href: "/student/notas",
    label: "Notas",
    desc: "Ver tus calificaciones",
    icon: ClipboardList,
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    ring: "ring-blue-100",
  },
  {
    href: "/student/asistencia",
    label: "Asistencia",
    desc: "Historial de presencia",
    icon: CalendarDays,
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    ring: "ring-emerald-100",
  },
  {
    href: "/student/wallet",
    label: "Billetera",
    desc: "Puntos y retiros",
    icon: Wallet,
    bg: "bg-amber-50",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    ring: "ring-amber-100",
  },
];

export default async function StudentHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("points_balance, full_name")
    .eq("id", user!.id)
    .single();

  const firstName = profile?.full_name?.split(" ")[0] || "estudiante";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-800">
          Hola,{" "}
          <span className="bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent">
            {firstName}
          </span>{" "}
          👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Bienvenido de vuelta a StudyPay.</p>
      </div>

      {/* Puntos */}
      <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-2xl p-6 text-white flex items-center justify-between">
        <div>
          <p className="text-white/70 text-sm font-500">Tus puntos acumulados</p>
          <p className="text-5xl font-800 mt-1">
            <AnimatedNumber value={profile?.points_balance ?? 0} />
          </p>
          <p className="text-white/60 text-xs mt-1">pts</p>
        </div>
        <div className="size-16 rounded-2xl bg-white/15 flex items-center justify-center">
          <Wallet className="size-8 text-white/80" />
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-700 text-foreground mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className={`${a.bg} ${a.ring} ring-1 rounded-2xl p-4 flex flex-col gap-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-md group`}
              >
                <div className="flex items-center justify-between">
                  <div className={`size-9 rounded-xl ${a.iconBg} flex items-center justify-center`}>
                    <Icon className={`size-5 ${a.iconColor}`} />
                  </div>
                  <ArrowRight className="size-4 text-foreground/30 group-hover:text-foreground/60 transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-700 text-foreground">{a.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
