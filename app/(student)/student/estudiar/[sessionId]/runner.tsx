"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Eye,
  Flame,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { answerQuestion, type AnswerResult } from "../actions";
import type { Database } from "@/lib/database.types";

type Kind = Database["public"]["Enums"]["question_kind"];

export type ClientQuestion = {
  id: string;
  kind: Kind;
  prompt: Record<string, unknown>;
};

type Feedback = Exclude<AnswerResult, { error: string }> & {
  // Mirror of what the user picked, for visual highlight.
  picked: { selectedIndex?: number; selectedTrue?: boolean };
};

export function StudyRunner({
  materialTitle,
  questions,
}: {
  materialTitle: string;
  questions: ClientQuestion[];
}) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, startTransition] = useTransition();
  const [score, setScore] = useState({ correct: 0, points: 0 });
  const [done, setDone] = useState(false);

  const current = questions[index];
  const total = questions.length;
  const progress = ((index + (feedback ? 1 : 0)) / total) * 100;

  function submit(
    response:
      | { selectedIndex: number }
      | { knewIt: boolean }
      | { selectedTrue: boolean },
    picked: { selectedIndex?: number; selectedTrue?: boolean }
  ) {
    if (feedback || !current) return;
    startTransition(async () => {
      const res = await answerQuestion({
        questionId: current.id,
        response,
      });
      if ("error" in res) return;
      setFeedback({ ...res, picked });
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
                <p className="text-xs text-muted-foreground">Puntos</p>
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

      <Item
        question={current}
        feedback={feedback}
        pending={pending}
        onSubmit={submit}
        onNext={next}
        isLast={index + 1 >= total}
      />
    </div>
  );
}

function Item({
  question,
  feedback,
  pending,
  onSubmit,
  onNext,
  isLast,
}: {
  question: ClientQuestion;
  feedback: Feedback | null;
  pending: boolean;
  onSubmit: (
    r:
      | { selectedIndex: number }
      | { knewIt: boolean }
      | { selectedTrue: boolean },
    picked: { selectedIndex?: number; selectedTrue?: boolean }
  ) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  switch (question.kind) {
    case "multiple_choice":
      return (
        <QuizCard
          question={question.prompt as { question: string; options: string[] }}
          feedback={feedback}
          pending={pending}
          onSubmit={(idx) => onSubmit({ selectedIndex: idx }, { selectedIndex: idx })}
          onNext={onNext}
          isLast={isLast}
        />
      );
    case "fill_blank":
      return (
        <ClozeCard
          question={question.prompt as { sentence: string; options: string[] }}
          feedback={feedback}
          pending={pending}
          onSubmit={(idx) => onSubmit({ selectedIndex: idx }, { selectedIndex: idx })}
          onNext={onNext}
          isLast={isLast}
        />
      );
    case "true_false":
      return (
        <TrueFalseCard
          question={question.prompt as { statement: string }}
          feedback={feedback}
          pending={pending}
          onSubmit={(val) =>
            onSubmit({ selectedTrue: val }, { selectedTrue: val })
          }
          onNext={onNext}
          isLast={isLast}
        />
      );
    case "flashcard":
      return (
        <FlashcardCard
          question={question.prompt as { front: string; back: string }}
          feedback={feedback}
          pending={pending}
          onSubmit={(knew) => onSubmit({ knewIt: knew }, {})}
          onNext={onNext}
          isLast={isLast}
        />
      );
    default:
      return <p>Tipo de pregunta no soportado: {question.kind}</p>;
  }
}

// ============================================================
// Sub-cards per kind
// ============================================================

function FeedbackBox({
  feedback,
  onNext,
  isLast,
}: {
  feedback: Feedback;
  onNext: () => void;
  isLast: boolean;
}) {
  const hasBonus =
    feedback.isCorrect && feedback.streakMultiplier > 1 && feedback.streakDays >= 2;
  return (
    <div className="rounded-md border bg-card p-3 text-sm space-y-2">
      <p className="font-medium">
        {feedback.isCorrect
          ? `¡Correcto! +${feedback.pointsAwarded} puntos`
          : "No era esta."}
      </p>
      {hasBonus && (
        <p className="text-xs text-orange-600 flex items-center gap-1">
          <Flame className="size-3" />
          Racha de {feedback.streakDays} días · ×{feedback.streakMultiplier.toFixed(1)}{" "}
          (base {feedback.basePoints})
        </p>
      )}
      {feedback.explanation && (
        <p className="text-muted-foreground">{feedback.explanation}</p>
      )}
      <Button onClick={onNext} className="w-full">
        {isLast ? "Ver resultado" : "Siguiente"}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

function OptionButton({
  index,
  text,
  feedback,
  pending,
  onPick,
}: {
  index: number;
  text: string;
  feedback: Feedback | null;
  pending: boolean;
  onPick: (i: number) => void;
}) {
  const picked = feedback?.picked.selectedIndex === index;
  const isCorrect = feedback != null && index === feedback.correctIndex;
  const isWrongPick = feedback != null && picked && !feedback.isCorrect;

  return (
    <button
      onClick={() => onPick(index)}
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
        {String.fromCharCode(65 + index)}
      </span>
      <span className="flex-1">{text}</span>
      {isCorrect ? (
        <CheckCircle2 className="size-4 text-emerald-600" />
      ) : isWrongPick ? (
        <XCircle className="size-4 text-red-600" />
      ) : null}
    </button>
  );
}

function QuizCard({
  question,
  feedback,
  pending,
  onSubmit,
  onNext,
  isLast,
}: {
  question: { question: string; options: string[] };
  feedback: Feedback | null;
  pending: boolean;
  onSubmit: (idx: number) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg leading-snug">
          {question.question}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <OptionButton
              key={i}
              index={i}
              text={opt}
              feedback={feedback}
              pending={pending}
              onPick={onSubmit}
            />
          ))}
        </div>
        {feedback && <FeedbackBox feedback={feedback} onNext={onNext} isLast={isLast} />}
      </CardContent>
    </Card>
  );
}

function ClozeCard({
  question,
  feedback,
  pending,
  onSubmit,
  onNext,
  isLast,
}: {
  question: { sentence: string; options: string[] };
  feedback: Feedback | null;
  pending: boolean;
  onSubmit: (idx: number) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  // Render the sentence highlighting the blank.
  const parts = question.sentence.split("___");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg leading-snug">
          {parts[0]}
          <span className="inline-block min-w-[3rem] mx-1 px-2 py-0.5 border-b-2 border-foreground/40 text-muted-foreground">
            ___
          </span>
          {parts[1] ?? ""}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {question.options.map((opt, i) => (
            <OptionButton
              key={i}
              index={i}
              text={opt}
              feedback={feedback}
              pending={pending}
              onPick={onSubmit}
            />
          ))}
        </div>
        {feedback && <FeedbackBox feedback={feedback} onNext={onNext} isLast={isLast} />}
      </CardContent>
    </Card>
  );
}

function TrueFalseCard({
  question,
  feedback,
  pending,
  onSubmit,
  onNext,
  isLast,
}: {
  question: { statement: string };
  feedback: Feedback | null;
  pending: boolean;
  onSubmit: (val: boolean) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  function boolBtn(value: boolean) {
    const label = value ? "Verdadero" : "Falso";
    const picked = feedback?.picked.selectedTrue === value;
    const isCorrect = feedback != null && feedback.correctBoolean === value;
    const isWrongPick = feedback != null && picked && !feedback.isCorrect;

    return (
      <button
        key={String(value)}
        onClick={() => onSubmit(value)}
        disabled={pending || feedback !== null}
        className={[
          "border rounded-md py-6 text-base font-semibold flex items-center justify-center gap-2 transition-all",
          feedback === null ? "hover:bg-accent cursor-pointer" : "cursor-default",
          isCorrect
            ? "border-emerald-500/60 bg-emerald-500/10"
            : isWrongPick
              ? "border-red-500/60 bg-red-500/10"
              : "",
        ].join(" ")}
      >
        {label}
        {isCorrect ? (
          <CheckCircle2 className="size-4 text-emerald-600" />
        ) : isWrongPick ? (
          <XCircle className="size-4 text-red-600" />
        ) : null}
      </button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg leading-snug">
          {question.statement}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {boolBtn(true)}
          {boolBtn(false)}
        </div>
        {feedback && <FeedbackBox feedback={feedback} onNext={onNext} isLast={isLast} />}
      </CardContent>
    </Card>
  );
}

function FlashcardCard({
  question,
  feedback,
  pending,
  onSubmit,
  onNext,
  isLast,
}: {
  question: { front: string; back: string };
  feedback: Feedback | null;
  pending: boolean;
  onSubmit: (knewIt: boolean) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const [revealed, setRevealed] = useState(false);

  // Reset reveal state when the card changes (feedback goes back to null).
  if (feedback === null && revealed && pending === false) {
    // Wait — we want to keep revealed=true during pending so the buttons stay
    // disabled visibly. Reset only after next() clears feedback.
  }

  if (feedback) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">
            {question.front}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border bg-card p-4 text-sm">
            {question.back}
          </div>
          <FeedbackBox
            feedback={feedback}
            onNext={() => {
              setRevealed(false);
              onNext();
            }}
            isLast={isLast}
          />
        </CardContent>
      </Card>
    );
  }

  if (!revealed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl leading-snug min-h-24 flex items-center">
            {question.front}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setRevealed(true)}
          >
            <Eye className="size-4" />
            Ver respuesta
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-muted-foreground">
          {question.front}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border bg-card p-4 text-sm">
          {question.back}
        </div>
        <p className="text-xs text-center text-muted-foreground">
          ¿Te acordabas?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => onSubmit(false)}
          >
            <XCircle className="size-4" />
            No
          </Button>
          <Button disabled={pending} onClick={() => onSubmit(true)}>
            <CheckCircle2 className="size-4" />
            Sí
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
