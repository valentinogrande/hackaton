"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, RotateCw } from "lucide-react";
import type { FlashcardItem as Item } from "@/lib/study-types";

export function FlashcardItem({ item, onAnswer }: { item: Item; onAnswer: (correct: boolean) => void }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="relative h-[360px]" style={{ perspective: 1500 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={item.hash}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
            style={{ transformStyle: "preserve-3d" }}
          >
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
              style={{ transformStyle: "preserve-3d" }}
              onClick={() => setFlipped((f) => !f)}
            >
              {/* Front */}
              <div
                className="absolute inset-0 bg-card ring-1 ring-border rounded-2xl p-8 grid place-items-center cursor-pointer"
                style={{ backfaceVisibility: "hidden" }}
              >
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider text-violet-600 font-bold mb-3">Concepto</p>
                  <p className="text-3xl sm:text-4xl font-bold leading-tight">{item.front}</p>
                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mt-6">
                    <RotateCw className="w-3 h-3" /> Tocá para ver
                  </p>
                </div>
              </div>
              {/* Back */}
              <div
                className="absolute inset-0 rounded-2xl p-8 grid place-items-center cursor-pointer bg-violet-600 text-white"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider opacity-80 font-bold mb-3">Respuesta</p>
                  <p className="text-2xl sm:text-3xl font-bold leading-tight">{item.back}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-6">
        <button
          onClick={() => onAnswer(false)}
          className="px-5 py-4 rounded-2xl border-2 border-rose-300 text-rose-600 font-bold inline-flex items-center justify-center gap-2 hover:bg-rose-50 transition"
        >
          <X className="w-4 h-4" /> No sabía
        </button>
        <button
          onClick={() => onAnswer(true)}
          className="px-5 py-4 rounded-2xl border-2 border-emerald-500 bg-emerald-500 text-white font-bold inline-flex items-center justify-center gap-2 shadow-[0_4px_0_0_#065f46] hover:-translate-y-px transition"
        >
          <Check className="w-4 h-4" /> Sabía
        </button>
      </div>
    </div>
  );
}
