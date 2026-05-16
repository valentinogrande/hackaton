// Yield oracle — computes monthly yield for a cycle.
// Two implementations: ConfiguredAPYOracle (active) and LiveNAVOracle (stub).

import { createFinanceAdminClient } from "@/lib/finance/db";
import {
  DEFAULT_APY,
  DEFAULT_FEE_RATE,
  monthlyYieldUsd,
  round2,
} from "@/lib/finance/economy";

export type YieldComputation = {
  opening_aum_usd: number;
  closing_aum_usd: number;
  apy_used: number;
  fee_rate_used: number;
  gross_yield_usd: number;
  fees_usd: number;
  net_yield_usd: number;
  source: "configured_apy" | "live_nav";
};

export interface YieldOracle {
  computeCycle(periodYYYYMM: string): Promise<YieldComputation>;
}

class ConfiguredAPYOracle implements YieldOracle {
  async computeCycle(periodYYYYMM: string): Promise<YieldComputation> {
    const admin = createFinanceAdminClient();
    const monthStart = `${periodYYYYMM}-01`;

    const { data, error } = await admin
      .from("capital_contributions")
      .select("amount_usd, confirmed_at")
      .eq("status", "confirmed")
      .lt("confirmed_at", monthStart);
    if (error) throw new Error(`yield-oracle: ${error.message}`);

    const openingAum = (data ?? []).reduce(
      (acc, c) => acc + Number(c.amount_usd ?? 0),
      0,
    );

    const { gross_yield_usd, fees_usd, net_yield_usd } = monthlyYieldUsd(
      openingAum,
      DEFAULT_APY,
      DEFAULT_FEE_RATE,
    );

    const closingAum = round2(openingAum + net_yield_usd);

    return {
      opening_aum_usd: round2(openingAum),
      closing_aum_usd: closingAum,
      apy_used: DEFAULT_APY,
      fee_rate_used: DEFAULT_FEE_RATE,
      gross_yield_usd,
      fees_usd,
      net_yield_usd,
      source: "configured_apy",
    };
  }
}

class LiveNAVOracle implements YieldOracle {
  async computeCycle(_periodYYYYMM: string): Promise<YieldComputation> {
    throw new Error(
      "LiveNAVOracle not implemented — connect to brokerage API (Allaria/Balanz/IOL) when ready",
    );
  }
}

export function getYieldOracle(): YieldOracle {
  const choice = (process.env.FINANCE_YIELD_ORACLE ?? "configured_apy").toLowerCase();
  if (choice === "live_nav") return new LiveNAVOracle();
  return new ConfiguredAPYOracle();
}
