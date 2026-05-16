"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import type { ClozeItem as Item } from "@/lib/study-types";

export function ClozeItem({ item, onAnswer }: { item: Item; onAnswer: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);

  const [before, after] = item.sentence.split("___");
  const revealed = picked !== null;
  const correct = picked === item.correctIndex;

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <motion.div
        key={item.hash}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="bg-card ring-1 ring-border rounded-2xl p-6 sm:p-8"
      >
        <p className="text-2xl sm:text-3xl leading-snug mb-6 font-bold">
          {before}
          <span
            className={[
              "inline-block min-w-[6ch] mx-1 px-3 py-1 rounded-lg border-b-4 text-center font-bold",
              revealed
                ? correct
                  ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                  : "border-rose-400 text-rose-600 bg-rose-50"
                : "border-violet-400 text-violet-600 bg-violet-50",
            ].join(" ")}
          >
            {revealed ? item.answer : "___"}
          </span>
          {after}
        </p>

        <div className="grid grid-cols-2 gap-2">
          {item.options.map((opt, i) => {
            const isCorrect = i === item.correctIndex;
            const isPicked = picked === i;
            const state = !revealed ? "idle" : isCorrect ? "correct" : isPicked ? "wrong" : "dim";
            return (
              <motion.button
                key={i}
                onClick={() => pick(i)}
                whileTap={!revealed ? { scale: 0.97 } : undefined}
                animate={state === "wrong" ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.35 }}
                className={[
                  "px-4 py-3 rounded-2xl border-2 font-medium text-sm text-left transition-colors",
                  state === "correct"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : state === "wrong"
                      ? "border-rose-400 bg-rose-50 text-rose-600"
                      : state === "dim"
                        ? "border-border opacity-40"
                        : "border-border hover:border-violet-400 hover:bg-violet-50",
                ].join(" ")}
              >
                <span className="flex items-center gap-2">
                  <span>{opt}</span>
                  {state === "correct" && <Check className="w-4 h-4 shrink-0" />}
                  {state === "wrong" && <X className="w-4 h-4 shrink-0" />}
                </span>
              </motion.button>
            );
          })}
        </div>

        {revealed && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
            <button
              onClick={() => onAnswer(correct)}
              className="w-full bg-violet-600 text-white rounded-2xl py-3.5 px-6 font-semibold shadow-[0_4px_0_0_#5b21b6] hover:-translate-y-px transition-transform"
            >
              Siguiente
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
