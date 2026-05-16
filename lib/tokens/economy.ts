// Token economy helpers. Dev TOKENS implements + tunes formulas.

export const POINTS_PER_CORRECT_ANSWER = {
  multiple_choice: 5,
  flashcard: 3,
  fill_blank: 7,
  open: 10,
} as const;

// Streak multipliers — Dev TOKENS can rework. Applied on top of base points.
export function streakMultiplier(consecutiveCorrect: number): number {
  if (consecutiveCorrect >= 10) return 2.0;
  if (consecutiveCorrect >= 5) return 1.5;
  if (consecutiveCorrect >= 3) return 1.2;
  return 1.0;
}

// Estimate of what a student will earn this period (in fiat) given current pool + score.
// Returns { share: 0..1, estimatedPayout }.
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
