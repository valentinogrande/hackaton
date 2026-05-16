import Link from "next/link";
import { Brain, ClipboardList, CalendarDays, Wallet, ArrowRight, Flame, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { readCurrentStreak } from "@/lib/data/streaks";
import { streakMultiplier, nextStreakTarget } from "@/lib/tokens/economy";
import { AnimatedNumber } from "@/components/ui/animated-number";

const QUICK_ACTIONS = [
  {
    href: "/student/estudiar",
    label: "Estudiar",
    desc: "Sesiones mixtas con IA",
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

const TIER_LABEL: Record<string, string> = {
  none: "Sin racha",
  warmup: "Calentando",
  fire: "En llamas",
  blaze: "Imparable",
  legend: "Leyenda",
};

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

  const streak = await readCurrentStreak(user!.id);
  const { multiplier, tier } = streakMultiplier(streak);
  const nextTarget = nextStreakTarget(streak);
  const daysToNext = nextTarget ? nextTarget - streak : null;

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

      {/* Puntos + racha */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-2xl p-6 text-white">
          <p className="text-white/70 text-sm font-500">Tus puntos acumulados</p>
          <p className="text-5xl font-800 mt-1">
            <AnimatedNumber value={profile?.points_balance ?? 0} />
          </p>
          <p className="text-white/60 text-xs mt-1">pts</p>
        </div>

        <div className="bg-card ring-1 ring-border rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <Flame className={`size-5 ${streak >= 2 ? "text-orange-500" : "text-muted-foreground/50"}`} />
            <p className="text-sm font-600 text-foreground">Racha de estudio</p>
          </div>
          <div>
            <p className="text-5xl font-800 mt-2">
              {streak}
              <span className="text-base font-500 text-muted-foreground ml-1">
                {streak === 1 ? "día" : "días"}
              </span>
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-600 bg-violet-100 text-violet-700 rounded-full px-2.5 py-0.5">
                ×{multiplier.toFixed(1)} pts · {TIER_LABEL[tier]}
              </span>
              {daysToNext !== null && (
                <span className="text-xs text-muted-foreground">{daysToNext} para subir</span>
              )}
            </div>
          </div>
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

      {/* Streak motivacional */}
      <div className="bg-violet-50 ring-1 ring-violet-100 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="font-700 text-foreground flex items-center gap-2">
            <Sparkles className="size-4 text-violet-500" />
            {streak >= 14
              ? "¡Sos leyenda! Ganás ×3 puntos."
              : streak >= 7
                ? "¡En llamas! Ganás ×2 puntos."
                : streak >= 4
                  ? "¡Buena racha! Ganás ×1.5 puntos."
                  : streak >= 2
                    ? "×1.2 puntos por mantener la racha."
                    : "Estudiá hoy para arrancar tu racha."}
          </p>
          <p className="text-xs text-muted-foreground">
            2d → ×1.2 · 4d → ×1.5 · 7d → ×2 · 14d → ×3
          </p>
        </div>
        <Link
          href="/student/estudiar"
          className="shrink-0 bg-violet-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-[0_3px_0_0_#5b21b6] hover:-translate-y-px transition-transform"
        >
          Estudiar
        </Link>
      </div>
    </div>
  );
}
