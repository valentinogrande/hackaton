"use client";
import { motion } from "framer-motion";
import { Check, ArrowRight, Trophy } from "lucide-react";
import Link from "next/link";

export function VictoryScreen({
  correct,
  total,
  points,
  retryRounds,
}: {
  correct: number;
  total: number;
  points: number;
  retryRounds: number;
}) {
  const pct = total === 0 ? 100 : Math.round((correct / total) * 100);
  const perfect = correct === total && retryRounds === 0;

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[32rem] text-center"
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto w-28 h-28 rounded-full bg-violet-50 border-4 border-violet-400 grid place-items-center shadow-[0_12px_30px_-24px_rgba(109,40,217,0.4)]"
        >
          <div className="w-16 h-16 rounded-full bg-violet-600 text-white grid place-items-center">
            {perfect ? (
              <Trophy className="w-8 h-8" strokeWidth={2.6} />
            ) : (
              <Check className="w-8 h-8" strokeWidth={3.4} />
            )}
          </div>
        </motion.div>

        <h1 className="mt-10 text-[2.1rem] sm:text-[2.5rem] font-extrabold tracking-tight text-violet-600 leading-tight">
          ¡Sesión completada!
        </h1>

        <p className="mt-3 text-muted-foreground text-base">
          {points > 0 ? `Ganaste +${points} puntos` : "¡Seguí practicando!"}
        </p>

        <div className="mt-8 max-w-md mx-auto rounded-[1.45rem] overflow-hidden border-2 border-violet-400">
          <div className="bg-violet-600 text-white text-sm font-bold tracking-wide py-3 uppercase">
            Resultado
          </div>
          <div className="bg-white py-6 px-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-extrabold text-violet-600">{correct}/{total}</p>
              <p className="text-xs text-muted-foreground mt-1">Correctas</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-violet-600">{pct}%</p>
              <p className="text-xs text-muted-foreground mt-1">Aciertos</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-emerald-600">+{points}</p>
              <p className="text-xs text-muted-foreground mt-1">Puntos</p>
            </div>
          </div>
        </div>

        <Link
          href="/student/estudiar"
          className="mt-8 w-full max-w-md rounded-2xl bg-violet-600 text-white py-4 px-6 text-lg font-semibold shadow-[0_6px_0_0_#5b21b6] hover:-translate-y-px transition-transform inline-flex items-center justify-center gap-2"
        >
          Otra sesión
          <ArrowRight className="w-5 h-5" />
        </Link>

        <Link
          href="/student"
          className="mt-4 block text-sm font-semibold text-muted-foreground hover:text-violet-600 transition-colors"
        >
          Ir al inicio
        </Link>
      </motion.div>
    </div>
  );
}
