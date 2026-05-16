// Finance constants + helpers. Single source of truth for tuning the money flow.
// See docs/superpowers/specs/2026-05-16-modulo-financiero-design.md

export const MAX_STUDENT_PAYOUT_PER_PERIOD_ARS = 75_000;

export const DEFAULT_APY = Number(process.env.FINANCE_DEFAULT_APY ?? "0.043");
export const DEFAULT_FEE_RATE = Number(process.env.FINANCE_FEE_RATE ?? "0.015");
export const DEFAULT_FX_ARS_PER_USD = Number(
  process.env.FINANCE_FX_ARS_PER_USD ?? "1300",
);

export const DEFAULT_ALLOCATION = {
  student: 0.6,
  investor: 0.3,
  operation: 0.1,
} as const;

export const UIF_THRESHOLD_USD = 50_000;
export const MIN_STUDENT_WITHDRAWAL_ARS = 1_500;

export function monthlyYieldUsd(aumUsd: number, apy: number, feeRate: number) {
  const gross = aumUsd * (apy / 12);
  const fees = aumUsd * (feeRate / 12);
  const net = Math.max(gross - fees, 0);
  return {
    gross_yield_usd: round2(gross),
    fees_usd: round2(fees),
    net_yield_usd: round2(net),
  };
}

export function splitAllocation(
  netYieldUsd: number,
  shares = DEFAULT_ALLOCATION,
) {
  return {
    student_total_usd: round2(netYieldUsd * shares.student),
    investor_total_usd: round2(netYieldUsd * shares.investor),
    operation_total_usd: round2(netYieldUsd * shares.operation),
  };
}

export function usdToArs(usd: number, fxArsPerUsd = DEFAULT_FX_ARS_PER_USD) {
  return round2(usd * fxArsPerUsd);
}

export function arsToUsd(ars: number, fxArsPerUsd = DEFAULT_FX_ARS_PER_USD) {
  if (fxArsPerUsd <= 0) return 0;
  return round2(ars / fxArsPerUsd);
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function isValidPeriod(period: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

export function currentPeriod(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
