"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { SessionItem } from "@/lib/study-types";
import { POINTS_MAP } from "@/lib/study-types";
import { QuizItem } from "./quiz-item";
import { FlashcardItem } from "./flashcard-item";
import { ClozeItem } from "./cloze-item";
import { TrueFalseItem } from "./true-false-item";
import { VictoryScreen } from "./victory-screen";

type FlowMode = "primary" | "done";

type AnswerRecord = { item: SessionItem; correct: boolean };

function renderItem(item: SessionItem, onAnswer: (correct: boolean) => void) {
  if (item.type === "flashcard") return <FlashcardItem item={item} onAnswer={onAnswer} />;
  if (item.type === "quiz") return <QuizItem item={item} onAnswer={onAnswer} />;
  if (item.type === "cloze") return <ClozeItem item={item} onAnswer={onAnswer} />;
  return <TrueFalseItem item={item} onAnswer={onAnswer} />;
}

export function SessionShell({
  materialTitle,
  items,
  onItemAnswer,
  onFinish,
}: {
  materialTitle: string;
  items: SessionItem[];
  onItemAnswer: (item: SessionItem, correct: boolean) => void;
  onFinish: (correct: number, total: number, points: number, retryRounds: number) => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<FlowMode>("primary");
  const [stepIndex, setStepIndex] = useState(0);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  const currentItem = items[stepIndex] ?? null;
  const progressPct =
    items.length === 0 ? 100 : Math.min(100, Math.round((stepIndex / items.length) * 100));

  function finishAll(allRecords: AnswerRecord[], points: number) {
    const scored = allRecords.filter((r) => r.item.type !== "flashcard");
    const correct = scored.filter((r) => r.correct).length;
    const total = scored.length;
    onFinish(correct, total, points, 0);
    setMode("done");
  }

  function handleAnswer(item: SessionItem, correct: boolean) {
    onItemAnswer(item, correct);

    const pts = correct ? POINTS_MAP[item.type] : 0;
    const nextPoints = totalPoints + pts;
    setTotalPoints(nextPoints);

    const next = [...records, { item, correct }];
    setRecords(next);

    if (stepIndex + 1 < items.length) {
      setStepIndex((i) => i + 1);
    } else {
      finishAll(next, nextPoints);
    }
  }

  if (mode === "done") {
    const scored = records.filter((r) => r.item.type !== "flashcard");
    return (
      <VictoryScreen
        correct={scored.filter((r) => r.correct).length}
        total={scored.length}
        points={totalPoints}
        retryRounds={0}
      />
    );
  }

  return (
    <div className="min-h-dvh flex flex-col -m-6">
      {/* Header sticky */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/student/estudiar")}
              className="w-10 h-10 rounded-full grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-violet-600 truncate">
                {materialTitle}
              </p>
              <p className="font-semibold text-sm truncate">
                Pregunta {Math.min(stepIndex + 1, items.length)} de {items.length}
              </p>
            </div>
            <span className="text-sm font-bold text-muted-foreground tabular-nums">{progressPct}%</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-violet-600"
              initial={false}
              animate={{ width: `${Math.max(4, progressPct)}%` }}
              transition={{ type: "spring", stiffness: 150, damping: 24 }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex items-center justify-center">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {currentItem && (
              <div key={`${stepIndex}-${currentItem.hash}`}>
                {renderItem(currentItem, (correct) => handleAnswer(currentItem, correct))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
