"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import type { TrueFalseItem as Item } from "@/lib/study-types";

export function TrueFalseItem({ item, onAnswer }: { item: Item; onAnswer: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<boolean | null>(null);

  function pick(v: boolean) {
    if (picked !== null) return;
    setPicked(v);
  }

  const revealed = picked !== null;
  const correct = picked === item.isTrue;

  return (
    <div className="w-full max-w-xl mx-auto">
      <motion.div
        key={item.statement}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="bg-card ring-1 ring-border rounded-2xl p-6 sm:p-8"
      >
        <div className="mb-6">
          <p className="text-2xl sm:text-3xl font-bold leading-snug">{item.statement}</p>
          <AnimatePresence>
            {revealed && (
              <motion.div
                key="verdict"
                initial={{ opacity: 0, y: -4, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, delay: 0.25 }}
                className={[
                  "mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
                  correct ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600",
                ].join(" ")}
              >
                {correct ? (
                  <><Check className="w-3.5 h-3.5" /> ¡Correcto! Es {item.isTrue ? "verdadero" : "falso"}</>
                ) : (
                  <><X className="w-3.5 h-3.5" /> Era {item.isTrue ? "verdadero" : "falso"}</>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {([true, false] as const).map((v) => {
            const isCorrect = v === item.isTrue;
            const isPicked = picked === v;
            const cls = !revealed
              ? "border-border hover:border-violet-400 hover:bg-violet-50"
              : isCorrect
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : isPicked
                  ? "border-rose-400 bg-rose-50 text-rose-600"
                  : "border-border opacity-50";
            return (
              <motion.button
                key={String(v)}
                onClick={() => pick(v)}
                whileTap={!revealed ? { scale: 0.97 } : undefined}
                className={`px-5 py-5 rounded-2xl border-2 font-bold text-lg transition-colors ${cls}`}
              >
                {v ? "Verdadero" : "Falso"}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {revealed && (
            <motion.div
              key="after"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.55 }}
              className="mt-5"
            >
              {item.explanation && (
                <p className={`text-sm leading-relaxed mb-4 ${correct ? "text-muted-foreground" : "text-foreground"}`}>
                  <span className="font-bold">{correct ? "Nota: " : "En realidad: "}</span>
                  {item.explanation}
                </p>
              )}
              <button
                onClick={() => onAnswer(correct)}
                className="w-full bg-violet-600 text-white rounded-2xl py-3.5 px-6 font-semibold shadow-[0_4px_0_0_#5b21b6] hover:-translate-y-px transition-transform"
              >
                Siguiente
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
