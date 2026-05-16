"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import type { QuizItem as Item } from "@/lib/study-types";

export function QuizItem({ item, onAnswer }: { item: Item; onAnswer: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
  }

  const revealed = picked !== null;
  const correct = picked === item.correctIndex;

  return (
    <div className="w-full max-w-xl mx-auto">
      <motion.div
        key={item.hash}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="bg-card ring-1 ring-border rounded-2xl p-6 sm:p-8"
      >
        <p className="text-2xl sm:text-3xl font-bold leading-snug mb-6">{item.question}</p>
        <div className="flex flex-col gap-3">
          {item.options.map((opt, i) => {
            const isCorrect = i === item.correctIndex;
            const isPicked = picked === i;
            const state = !revealed ? "idle" : isCorrect ? "correct" : isPicked ? "wrong" : "dim";
            return (
              <motion.button
                key={i}
                onClick={() => pick(i)}
                whileHover={!revealed ? { x: 4 } : undefined}
                whileTap={!revealed ? { scale: 0.98 } : undefined}
                animate={state === "wrong" ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
                className={[
                  "w-full text-left px-5 py-4 rounded-2xl border-2 font-medium flex items-center gap-3 transition-colors",
                  state === "correct"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : state === "wrong"
                      ? "border-rose-400 bg-rose-50 text-rose-600"
                      : state === "dim"
                        ? "border-border opacity-50"
                        : "border-border hover:border-violet-400 hover:bg-violet-50",
                ].join(" ")}
              >
                <span className="w-7 h-7 rounded-full grid place-items-center bg-muted text-sm font-bold shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
                {state === "correct" && <Check className="w-5 h-5 shrink-0" />}
                {state === "wrong" && <X className="w-5 h-5 shrink-0" />}
              </motion.button>
            );
          })}
        </div>
        <AnimatePresence>
          {revealed && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0 }}
              className="mt-5 overflow-hidden"
            >
              {!correct && item.explanation && (
                <div className="p-4 rounded-2xl bg-muted text-sm mb-4">
                  <p className="font-bold mb-1">Por qué:</p>
                  <p className="text-muted-foreground">{item.explanation}</p>
                </div>
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
