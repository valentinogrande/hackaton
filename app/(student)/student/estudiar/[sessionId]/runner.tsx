"use client";

import { SessionShell } from "@/components/study/session-shell";
import { recordAnswer, finishSession } from "../actions";
import type { SessionItem } from "@/lib/study-types";

export function Runner({
  sessionId,
  materialTitle,
  items,
  questionIds,
}: {
  sessionId: string;
  materialTitle: string;
  items: SessionItem[];
  questionIds: Record<string, string>;
}) {
  function handleItemAnswer(item: SessionItem, correct: boolean) {
    const questionId = questionIds[item.hash];
    if (!questionId) return;
    recordAnswer({ questionId, isCorrect: correct, itemType: item.type }).catch(() => {});
  }

  function handleFinish(_correct: number, _total: number, _points: number, _retryRounds: number) {
    finishSession(sessionId).catch(() => {});
  }

  return (
    <SessionShell
      materialTitle={materialTitle}
      items={items}
      onItemAnswer={handleItemAnswer}
      onFinish={handleFinish}
    />
  );
}
