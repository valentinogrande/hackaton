// Token economy helpers. Dev TOKENS implements + tunes formulas.

export const POINTS_PER_CORRECT_ANSWER = {
  multiple_choice: 5,
  flashcard: 3,
  fill_blank: 7,
  true_false: 4,
  open: 10,
} as const;

export function streakMultiplier(consecutiveCorrect: number): number {
  if (consecutiveCorrect >= 10) return 2.0;
  if (consecutiveCorrect >= 5) return 1.5;
  if (consecutiveCorrect >= 3) return 1.2;
  return 1.0;
}

export function estimatePayoutShare(args: {
  composite: number;
  totalComposite: number;
  pool: number;
  teacherShare: number;
}): { share: number; estimatedPayout: number } {
  if (args.totalComposite <= 0) return { share: 0, estimatedPayout: 0 };
  const studentPool = args.pool * (1 - args.teacherShare);
  const share = args.composite / args.totalComposite;
  return { share, estimatedPayout: Math.round(studentPool * share * 100) / 100 };
}
