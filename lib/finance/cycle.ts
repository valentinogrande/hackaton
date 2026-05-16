// Monthly close orchestration. Idempotent.
// 1. Open/recover yield_cycle for period.
// 2. Compute yield via oracle.
// 3. Split 60/30/10 and persist allocations.
// 4. Fund payout_periods for each active school + recompute_pools_v2.
// 5. Persist investor_returns proportional to AUM share.
// 6. Mark cycle as distributed; log audit events.

import { createFinanceAdminClient } from "@/lib/finance/db";
import {
  DEFAULT_ALLOCATION,
  DEFAULT_FX_ARS_PER_USD,
  isValidPeriod,
  round2,
  splitAllocation,
  usdToArs,
} from "@/lib/finance/economy";
import { getYieldOracle } from "@/lib/finance/yield-oracle";
import { recordAudit } from "@/lib/finance/ledger";

export type RunCycleResult = {
  cycleId: string;
  period: string;
  status: string;
  net_yield_usd: number;
  student_total_usd: number;
  investor_total_usd: number;
  operation_total_usd: number;
  schools_funded: number;
  investor_returns_created: number;
  reused_existing: boolean;
};

export async function runMonthlyClose(period: string): Promise<RunCycleResult> {
  if (!isValidPeriod(period)) throw new Error(`Invalid period: ${period}`);

  const admin = createFinanceAdminClient();

  const { data: existing, error: existingErr } = await admin
    .from("yield_cycles")
    .select("*")
    .eq("period", period)
    .maybeSingle();
  if (existingErr) throw new Error(`runMonthlyClose: ${existingErr.message}`);

  if (existing && existing.status !== "open") {
    return {
      cycleId: existing.id,
      period: existing.period,
      status: existing.status,
      net_yield_usd: Number(existing.net_yield_usd),
      student_total_usd: round2(
        Number(existing.net_yield_usd) * Number(existing.student_share),
      ),
      investor_total_usd: round2(
        Number(existing.net_yield_usd) * Number(existing.investor_share),
      ),
      operation_total_usd: round2(
        Number(existing.net_yield_usd) * Number(existing.operation_share),
      ),
      schools_funded: 0,
      investor_returns_created: 0,
      reused_existing: true,
    };
  }

  let cycleId: string;
  if (!existing) {
    const { data: created, error: createErr } = await admin
      .from("yield_cycles")
      .insert({ period, status: "open" })
      .select("id")
      .single();
    if (createErr || !created) throw new Error(`runMonthlyClose: ${createErr?.message}`);
    cycleId = created.id;
  } else {
    cycleId = existing.id;
  }

  const oracle = getYieldOracle();
  const computation = await oracle.computeCycle(period);

  const fxRate = DEFAULT_FX_ARS_PER_USD;

  const { error: updateComputedErr } = await admin
    .from("yield_cycles")
    .update({
      status: "computed",
      opening_aum_usd: computation.opening_aum_usd,
      closing_aum_usd: computation.closing_aum_usd,
      apy_annualized: computation.apy_used,
      fee_rate_annualized: computation.fee_rate_used,
      gross_yield_usd: computation.gross_yield_usd,
      fees_usd: computation.fees_usd,
      net_yield_usd: computation.net_yield_usd,
      fx_rate_ars_usd: fxRate,
      oracle_source: computation.source,
      computed_at: new Date().toISOString(),
    })
    .eq("id", cycleId);
  if (updateComputedErr) throw new Error(`runMonthlyClose: ${updateComputedErr.message}`);

  await recordAudit({
    kind: "yield_computed",
    subjectType: "yield_cycles",
    subjectId: cycleId,
    amount: computation.net_yield_usd,
    currency: "USD",
    payload: { period, ...computation },
  });

  const allocation = splitAllocation(computation.net_yield_usd, DEFAULT_ALLOCATION);

  // 1. Schools — fund payout_periods
  const { data: schools, error: schoolsErr } = await admin
    .from("schools")
    .select("id, name");
  if (schoolsErr) throw new Error(`runMonthlyClose: ${schoolsErr.message}`);

  const activeSchools = schools ?? [];
  const studentPoolPerSchoolUsd =
    activeSchools.length > 0
      ? round2(allocation.student_total_usd / activeSchools.length)
      : 0;
  const studentPoolPerSchoolArs = usdToArs(studentPoolPerSchoolUsd, fxRate);

  let schoolsFunded = 0;
  for (const school of activeSchools) {
    const { data: existingPeriod } = await admin
      .from("payout_periods")
      .select("id, pool_amount, rollover_amount, status")
      .eq("school_id", school.id)
      .eq("period", period)
      .maybeSingle();

    let periodId: string;
    if (existingPeriod) {
      if (existingPeriod.status !== "open") continue;
      periodId = existingPeriod.id;
      const newPool =
        Number(existingPeriod.pool_amount ?? 0) +
        studentPoolPerSchoolArs +
        Number(existingPeriod.rollover_amount ?? 0);
      const { error: upErr } = await admin
        .from("payout_periods")
        .update({
          pool_amount: round2(newPool),
          rollover_amount: 0,
          cycle_id: cycleId,
          funded_automatically: true,
        })
        .eq("id", periodId);
      if (upErr) throw new Error(`runMonthlyClose: ${upErr.message}`);
    } else {
      // Carry rollover from previous period for this school
      const { data: prevPeriod } = await admin
        .from("payout_periods")
        .select("rollover_amount")
        .eq("school_id", school.id)
        .order("period", { ascending: false })
        .limit(1)
        .maybeSingle();
      const carry = Number(prevPeriod?.rollover_amount ?? 0);

      const { data: created, error: insErr } = await admin
        .from("payout_periods")
        .insert({
          school_id: school.id,
          period,
          pool_amount: round2(studentPoolPerSchoolArs + carry),
          cycle_id: cycleId,
          funded_automatically: true,
        })
        .select("id")
        .single();
      if (insErr || !created) throw new Error(`runMonthlyClose: ${insErr?.message}`);
      periodId = created.id;

      if (carry > 0) {
        await admin
          .from("payout_periods")
          .update({ rollover_amount: 0 })
          .eq("school_id", school.id)
          .neq("id", periodId);
      }
    }

    const { error: rpcErr } = await admin.rpc("recompute_pools_v2", {
      p_period_id: periodId,
    });
    if (rpcErr) throw new Error(`runMonthlyClose: recompute_pools_v2 — ${rpcErr.message}`);

    await recordAudit({
      kind: "student_payout",
      subjectType: "payout_periods",
      subjectId: periodId,
      amount: studentPoolPerSchoolArs,
      currency: "ARS",
      payload: { period, school_id: school.id, school_name: school.name },
    });
    schoolsFunded += 1;
  }

  // 2. Investors — proportional to AUM share
  const { data: contributions, error: contribErr } = await admin
    .from("capital_contributions")
    .select("source_id, amount_usd")
    .eq("status", "confirmed")
    .not("amount_usd", "is", null);
  if (contribErr) throw new Error(`runMonthlyClose: ${contribErr.message}`);

  const totalsBySource = new Map<string, number>();
  for (const c of contributions ?? []) {
    const cur = totalsBySource.get(c.source_id) ?? 0;
    totalsBySource.set(c.source_id, cur + Number(c.amount_usd ?? 0));
  }
  const totalAum = [...totalsBySource.values()].reduce((a, b) => a + b, 0);

  let investorReturnsCreated = 0;
  if (totalAum > 0 && allocation.investor_total_usd > 0) {
    for (const [sourceId, sourceUsd] of totalsBySource) {
      const aumShare = sourceUsd / totalAum;
      const amountUsd = round2(allocation.investor_total_usd * aumShare);
      const amountArs = usdToArs(amountUsd, fxRate);

      const { error: irErr } = await admin.from("investor_returns").upsert(
        {
          cycle_id: cycleId,
          source_id: sourceId,
          aum_share: round8(aumShare),
          amount_usd: amountUsd,
          amount_ars: amountArs,
          status: "pending",
        },
        { onConflict: "cycle_id,source_id" },
      );
      if (irErr) throw new Error(`runMonthlyClose: investor_returns — ${irErr.message}`);

      await recordAudit({
        kind: "investor_return",
        subjectType: "capital_sources",
        subjectId: sourceId,
        amount: amountUsd,
        currency: "USD",
        payload: { cycle_id: cycleId, aum_share: aumShare },
      });
      investorReturnsCreated += 1;
    }
  }

  // 3. Operation expenses placeholder (actual expenses are logged separately)
  if (allocation.operation_total_usd > 0) {
    await admin.from("operation_expenses").insert({
      cycle_id: cycleId,
      category: "platform",
      description: "Reserved operation share for the cycle",
      amount_usd: allocation.operation_total_usd,
    });
  }

  await admin
    .from("yield_cycles")
    .update({ status: "distributed", distributed_at: new Date().toISOString() })
    .eq("id", cycleId);

  await recordAudit({
    kind: "yield_distributed",
    subjectType: "yield_cycles",
    subjectId: cycleId,
    amount: computation.net_yield_usd,
    currency: "USD",
    payload: { period, allocation, schools_funded: schoolsFunded },
  });

  return {
    cycleId,
    period,
    status: "distributed",
    net_yield_usd: computation.net_yield_usd,
    student_total_usd: allocation.student_total_usd,
    investor_total_usd: allocation.investor_total_usd,
    operation_total_usd: allocation.operation_total_usd,
    schools_funded: schoolsFunded,
    investor_returns_created: investorReturnsCreated,
    reused_existing: false,
  };
}

function round8(n: number) {
  return Math.round(n * 1e8) / 1e8;
}
