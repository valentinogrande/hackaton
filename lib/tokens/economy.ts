// Token economy helpers. Dev TOKENS tunes formulas.

export const POINTS_PER_CORRECT_ANSWER = {
  multiple_choice: 5,
  flashcard: 3,
  fill_blank: 7,
  true_false: 4,
  open: 10,
} as const;

// Daily-streak multiplier: more consecutive days of activity → more tokens.
// Multiplier applies to base points before they hit the ledger.
export function streakMultiplier(consecutiveDays: number): {
  multiplier: number;
  tier: "none" | "warmup" | "fire" | "blaze" | "legend";
} {
  if (consecutiveDays >= 14) return { multiplier: 3.0, tier: "legend" };
  if (consecutiveDays >= 7) return { multiplier: 2.0, tier: "blaze" };
  if (consecutiveDays >= 4) return { multiplier: 1.5, tier: "fire" };
  if (consecutiveDays >= 2) return { multiplier: 1.2, tier: "warmup" };
  return { multiplier: 1.0, tier: "none" };
}

export function nextStreakTarget(consecutiveDays: number): number | null {
  if (consecutiveDays < 2) return 2;
  if (consecutiveDays < 4) return 4;
  if (consecutiveDays < 7) return 7;
  if (consecutiveDays < 14) return 14;
  return null;
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
