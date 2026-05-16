import Link from "next/link";
import { Flame, Sparkles, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { readCurrentStreak } from "@/lib/data/streaks";
import { streakMultiplier, nextStreakTarget } from "@/lib/tokens/economy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TIER_COLOR: Record<string, string> = {
  none: "text-muted-foreground",
  warmup: "text-amber-600",
  fire: "text-orange-600",
  blaze: "text-red-600",
  legend: "text-fuchsia-600",
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        Hola, {profile?.full_name?.split(" ")[0] || "estudiante"}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tus puntos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{profile?.points_balance ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Flame className={`size-4 ${TIER_COLOR[tier]}`} />
              Racha de estudio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {streak} <span className="text-base font-normal text-muted-foreground">{streak === 1 ? "día" : "días"}</span>
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="outline">×{multiplier.toFixed(1)} puntos</Badge>
              {daysToNext !== null && (
                <span className="text-xs text-muted-foreground">
                  {daysToNext} para subir
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="size-4" />
              Billetera
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/student/wallet"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Ver mis pagos
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-2">
              <Sparkles className="size-4" />
              Mantené la racha
            </p>
            <p className="text-sm text-muted-foreground">
              {streak >= 14
                ? "¡Sos leyenda! Estás ganando 3x puntos por cada respuesta."
                : streak >= 7
                  ? "¡Estás en fuego! Ganás 2x puntos."
                  : streak >= 4
                    ? "¡Buena racha! Ganás 1.5x puntos."
                    : streak >= 2
                      ? "Sumando 1.2x por mantener la racha."
                      : "Estudiá hoy para arrancar tu racha."}
            </p>
          </div>
          <Link href="/student/estudiar" className={buttonVariants()}>
            Empezar a estudiar
          </Link>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-card p-3 text-xs text-muted-foreground">
        <p className="font-medium mb-1">Multiplicadores de racha</p>
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <li>2 días → 1.2×</li>
          <li>4 días → 1.5×</li>
          <li>7 días → 2×</li>
          <li>14+ días → 3×</li>
        </ul>
      </div>
    </div>
  );
}
