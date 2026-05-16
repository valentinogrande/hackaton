"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Sparkles, ArrowRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { answerQuestion } from "../actions";

type Question = {
  id: string;
  question: string;
  options: string[];
};

type Feedback = {
  selectedIndex: number;
  isCorrect: boolean;
  correctIndex: number;
  explanation: string;
  pointsAwarded: number;
};

export function StudyRunner({
  materialTitle,
  questions,
}: {
  materialTitle: string;
  questions: Question[];
}) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, startTransition] = useTransition();
  const [score, setScore] = useState({ correct: 0, points: 0 });
  const [done, setDone] = useState(false);

  const current = questions[index];
  const total = questions.length;
  const progress = ((index + (feedback ? 1 : 0)) / total) * 100;

  function pick(selectedIndex: number) {
    if (feedback || !current) return;
    startTransition(async () => {
      const res = await answerQuestion({
        questionId: current.id,
        selectedIndex,
      });
      if ("error" in res) return;
      setFeedback({
        selectedIndex,
        isCorrect: res.isCorrect,
        correctIndex: res.correctIndex,
        explanation: res.explanation,
        pointsAwarded: res.pointsAwarded,
      });
      setScore((s) => ({
        correct: s.correct + (res.isCorrect ? 1 : 0),
        points: s.points + res.pointsAwarded,
      }));
    });
  }

  function next() {
    if (index + 1 >= total) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setFeedback(null);
  }

  if (done) {
    const pct = Math.round((score.correct / total) * 100);
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5" />
              ¡Sesión completada!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold">
                  {score.correct}/{total}
                </p>
                <p className="text-xs text-muted-foreground">Correctas</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{pct}%</p>
                <p className="text-xs text-muted-foreground">Aciertos</p>
              </div>
              <div>
                <p className="text-3xl font-bold">+{score.points}</p>
                <p className="text-xs text-muted-foreground">Puntos ganados</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/student/estudiar"
                className={buttonVariants({ variant: "outline" })}
              >
                Otra sesión
              </Link>
              <Link
                href="/student/wallet"
                className={buttonVariants({ variant: "outline" })}
              >
                Mi billetera
              </Link>
              <Link href="/student" className={buttonVariants()}>
                Inicio
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">{materialTitle}</p>
        <p className="text-muted-foreground">
          {index + 1} / {total} · +{score.points} pts
        </p>
      </div>

      <div className="h-1 rounded bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg leading-snug">
            {current?.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {current?.options.map((opt, i) => {
              const picked = feedback?.selectedIndex === i;
              const isCorrect =
                feedback != null && i === feedback.correctIndex;
              const isWrongPick =
                feedback != null && picked && !feedback.isCorrect;

              return (
                <button
                  key={i}
                  onClick={() => pick(i)}
                  disabled={pending || feedback !== null}
                  className={[
                    "w-full text-left border rounded-md px-4 py-3 text-sm flex items-center gap-3 transition-all",
                    feedback === null
                      ? "hover:bg-accent hover:border-foreground/20 cursor-pointer"
                      : "cursor-default",
                    isCorrect
                      ? "border-emerald-500/60 bg-emerald-500/10"
                      : isWrongPick
                        ? "border-red-500/60 bg-red-500/10"
                        : feedback && picked
                          ? "border-muted-foreground/30"
                          : "",
                  ].join(" ")}
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {isCorrect ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : isWrongPick ? (
                    <XCircle className="size-4 text-red-600" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {feedback && (
            <div className="rounded-md border bg-card p-3 text-sm space-y-2">
              <p className="font-medium">
                {feedback.isCorrect
                  ? `¡Correcto! +${feedback.pointsAwarded} puntos`
                  : "No era esta. Mirá:"}
              </p>
              <p className="text-muted-foreground">{feedback.explanation}</p>
              <Button onClick={next} className="w-full">
                {index + 1 >= total ? "Ver resultado" : "Siguiente"}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
