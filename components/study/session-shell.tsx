"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import type { SessionItem } from "@/lib/study-types";
import { POINTS_MAP } from "@/lib/study-types";
import { QuizItem } from "./quiz-item";
import { FlashcardItem } from "./flashcard-item";
import { ClozeItem } from "./cloze-item";
import { TrueFalseItem } from "./true-false-item";
import { VictoryScreen } from "./victory-screen";

type FlowMode = "primary" | "retry" | "done";

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
  const [primaryRecords, setPrimaryRecords] = useState<AnswerRecord[]>([]);
  const [retryQueue, setRetryQueue] = useState<SessionItem[]>([]);
  const [retryAnswers, setRetryAnswers] = useState<AnswerRecord[]>([]);
  const [retryRound, setRetryRound] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  const currentItems = mode === "primary" ? items : retryQueue;
  const currentItem = currentItems[stepIndex] ?? null;
  const progressPct = items.length === 0 ? 100 : Math.min(100, Math.round((masteredCount / items.length) * 100));

  function finishAll(allPrimaryRecords: AnswerRecord[], points: number, rounds: number) {
    const scored = allPrimaryRecords.filter((r) => r.item.type !== "flashcard");
    const correct = scored.filter((r) => r.correct).length;
    const total = scored.length;
    onFinish(correct, total, points, rounds);
    setMode("done");
  }

  function finalizePrimary(records: AnswerRecord[], points: number) {
    const wrong = records.filter((r) => !r.correct && r.item.type !== "flashcard");
    if (wrong.length === 0) {
      finishAll(records, points, 0);
      return;
    }
    setRetryQueue(wrong.map((r) => r.item));
    setRetryAnswers([]);
    setRetryRound(1);
    setStepIndex(0);
    setMode("retry");
  }

  function finalizeRetry(answers: AnswerRecord[], allPrimary: AnswerRecord[], points: number, round: number) {
    const wrong = answers.filter((a) => !a.correct);
    if (wrong.length === 0) {
      finishAll(allPrimary, points, round);
      return;
    }
    setRetryQueue(wrong.map((a) => a.item));
    setRetryAnswers([]);
    setRetryRound((r) => r + 1);
    setStepIndex(0);
  }

  function handleAnswer(item: SessionItem, correct: boolean) {
    onItemAnswer(item, correct);

    const pts = correct && mode === "primary" ? POINTS_MAP[item.type] : 0;
    const nextPoints = totalPoints + pts;
    setTotalPoints(nextPoints);

    if (correct || item.type === "flashcard") {
      setMasteredCount((c) => c + 1);
    }

    if (mode === "primary") {
      const next = [...primaryRecords, { item, correct }];
      setPrimaryRecords(next);
      if (stepIndex + 1 < items.length) {
        setStepIndex((i) => i + 1);
      } else {
        finalizePrimary(next, nextPoints);
      }
      return;
    }

    if (mode === "retry") {
      const next = [...retryAnswers, { item, correct }];
      setRetryAnswers(next);
      if (stepIndex + 1 < retryQueue.length) {
        setStepIndex((i) => i + 1);
      } else {
        finalizeRetry(next, primaryRecords, nextPoints, retryRound);
      }
    }
  }

  if (mode === "done") {
    const scored = primaryRecords.filter((r) => r.item.type !== "flashcard");
    return (
      <VictoryScreen
        correct={scored.filter((r) => r.correct).length}
        total={scored.length}
        points={totalPoints}
        retryRounds={retryRound}
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
              <p className="font-semibold text-sm truncate">Sesión de estudio</p>
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

        <AnimatePresence initial={false}>
          {mode === "retry" && (
            <motion.div
              key={`retry-${retryRound}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden bg-violet-50 border-t border-violet-200"
            >
              <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
                  className="w-9 h-9 rounded-full bg-violet-600 text-white grid place-items-center shrink-0"
                >
                  <RotateCw className="w-4 h-4" strokeWidth={3} />
                </motion.div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-violet-600">
                    Reintento {retryRound}
                  </p>
                  <p className="text-sm font-semibold text-violet-700 leading-tight">
                    {retryQueue.length} pregunta{retryQueue.length !== 1 ? "s" : ""} por dominar. ¡Vamos!
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex items-center justify-center">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {currentItem && (
              <div key={`${mode}-${retryRound}-${stepIndex}-${currentItem.hash}`}>
                {renderItem(currentItem, (correct) => handleAnswer(currentItem, correct))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
