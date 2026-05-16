-- ============================================================
-- 0008 FINANCE: yield cycles, investor returns, operation expenses
-- + global student payout cap with rollover + payment_transactions
-- + recompute_pools_v2 patched to apply the cap.
-- ============================================================

create type yield_cycle_status as enum (
  'open',
  'computed',
  'distributed',
  'closed',
  'reversed'
);

create table yield_cycles (
  id uuid primary key default gen_random_uuid(),
  period text not null unique,
  status yield_cycle_status not null default 'open',
  opening_aum_usd numeric(14,2) not null default 0,
  closing_aum_usd numeric(14,2) not null default 0,
  apy_annualized numeric(6,4) not null default 0.0430,
  fee_rate_annualized numeric(6,4) not null default 0.0150,
  gross_yield_usd numeric(14,2) not null default 0,
  fees_usd numeric(14,2) not null default 0,
  net_yield_usd numeric(14,2) not null default 0,
  fx_rate_ars_usd numeric(14,6),
  student_share numeric(4,3) not null default 0.600,
  investor_share numeric(4,3) not null default 0.300,
  operation_share numeric(4,3) not null default 0.100,
  oracle_source text not null default 'configured_apy',
  computed_at timestamptz,
  distributed_at timestamptz,
  closed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  check (student_share + investor_share + operation_share <= 1.001),
  check (student_share + investor_share + operation_share >= 0.999)
);
create index on yield_cycles(status);

create table investor_returns (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references yield_cycles(id) on delete cascade,
  source_id uuid not null references capital_sources(id) on delete cascade,
  aum_share numeric(10,8) not null,
  amount_usd numeric(14,2) not null default 0,
  amount_ars numeric(14,2),
  status text not null default 'pending',
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique (cycle_id, source_id)
);
create index on investor_returns(source_id);
create index on investor_returns(status);

create table operation_expenses (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references yield_cycles(id) on delete set null,
  category text not null,
  description text,
  amount_usd numeric(14,2) not null check (amount_usd >= 0),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index on operation_expenses(cycle_id);
create index on operation_expenses(category);

-- Link payout_periods to its funding cycle + add rollover for capped amounts
alter table payout_periods add column cycle_id uuid references yield_cycles(id) on delete set null;
alter table payout_periods add column funded_automatically boolean not null default false;
alter table payout_periods add column rollover_amount numeric(12,2) not null default 0;
create index on payout_periods(cycle_id);

-- Payment gateway transactions
create type payment_provider as enum ('mercadopago', 'manual', 'mock');
create type payment_status as enum (
  'pending',
  'submitted',
  'approved',
  'rejected',
  'refunded',
  'failed'
);

create table payment_transactions (
  id uuid primary key default gen_random_uuid(),
  withdrawal_id uuid not null references withdrawals(id) on delete cascade,
  provider payment_provider not null,
  provider_payment_id text,
  amount numeric(12,2) not null,
  currency currency_code not null default 'ARS',
  status payment_status not null default 'pending',
  destination_snapshot jsonb not null,
  raw_request jsonb,
  raw_response jsonb,
  submitted_at timestamptz,
  finalized_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create index on payment_transactions(withdrawal_id);
create index on payment_transactions(status);

alter table yield_cycles enable row level security;
alter table investor_returns enable row level security;
alter table operation_expenses enable row level security;
alter table payment_transactions enable row level security;

create policy yield_cycles_admin_all on yield_cycles for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy investor_returns_admin_all on investor_returns for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy operation_expenses_admin_all on operation_expenses for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy payment_transactions_admin_all on payment_transactions for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy payment_transactions_student_read on payment_transactions for select
  using (
    exists (
      select 1 from withdrawals w
      where w.id = payment_transactions.withdrawal_id
        and w.student_id = auth.uid()
    )
  );

-- ============================================================
-- recompute_pools_v2: now applies a global per-student cap.
-- Excess is accumulated in payout_periods.rollover_amount for the next cycle.
-- Cap is read from a SQL config setting set by the application layer:
--   select set_config('app.max_student_payout_ars', '75000', true);
-- If unset, defaults to 75000.
-- ============================================================

create or replace function public.get_max_student_payout_ars()
returns numeric
language plpgsql
stable
as $$
declare
  v text;
begin
  begin
    v := current_setting('app.max_student_payout_ars', true);
  exception when others then
    v := null;
  end;
  if v is null or v = '' then
    return 75000;
  end if;
  return v::numeric;
end;
$$;

create or replace function public.recompute_pools_v2(p_period_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
  v_period text;
  v_period_start date;
  v_period_end date;
  v_pool numeric;
  v_teacher_share numeric;
  v_student_pool numeric;
  v_teacher_bonus_pool numeric;
  v_teacher_count int;
  v_per_teacher_bonus numeric;
  v_max_payout numeric;
  v_total_excess numeric;
begin
  v_max_payout := public.get_max_student_payout_ars();

  select school_id, period, pool_amount, teacher_share
    into v_school_id, v_period, v_pool, v_teacher_share
    from payout_periods where id = p_period_id;

  v_period_start := (v_period || '-01')::date;
  v_period_end := (v_period_start + interval '1 month')::date;

  v_teacher_bonus_pool := v_pool * v_teacher_share;
  v_student_pool := v_pool - v_teacher_bonus_pool;

  select count(distinct s.teacher_id)
    into v_teacher_count
    from subjects s
    join courses c on c.id = s.course_id
    where c.school_id = v_school_id
      and s.teacher_id is not null;

  v_per_teacher_bonus := case
    when v_teacher_count > 0 then v_teacher_bonus_pool / v_teacher_count
    else 0
  end;

  delete from teacher_pools where period_id = p_period_id;
  delete from student_payouts where period_id = p_period_id;
  delete from student_scores where period_id = p_period_id;

  insert into teacher_pools (period_id, teacher_id, pool_amount, teacher_bonus)
  select
    p_period_id,
    sub.teacher_id,
    case when v_teacher_count > 0 then v_student_pool / v_teacher_count else 0 end,
    v_per_teacher_bonus
  from (
    select distinct s.teacher_id
    from subjects s
    join courses c on c.id = s.course_id
    where c.school_id = v_school_id
      and s.teacher_id is not null
  ) sub;

  with teacher_courses as (
    select distinct s.teacher_id, c.id as course_id
    from subjects s
    join courses c on c.id = s.course_id
    where c.school_id = v_school_id
      and s.teacher_id is not null
  ),
  teacher_course_budget as (
    select
      tc.teacher_id,
      tc.course_id,
      tp.pool_amount / nullif(count(*) over (partition by tc.teacher_id), 0) as budget
    from teacher_courses tc
    join teacher_pools tp
      on tp.teacher_id = tc.teacher_id
     and tp.period_id = p_period_id
  ),
  student_composites as (
    select
      tcb.teacher_id,
      tcb.course_id,
      coalesce(tcb.budget, 0) as budget,
      e.student_id,
      coalesce((
        select avg(g.value)
        from grades g
        join subjects s on s.id = g.subject_id
        where g.student_id = e.student_id
          and s.teacher_id = tcb.teacher_id
          and s.course_id = tcb.course_id
          and g.created_at >= v_period_start
          and g.created_at < v_period_end
      ), 0)::numeric as grade_avg,
      coalesce((
        select sum(pl.delta)::int
        from points_ledger pl
        join answers a on a.id = pl.ref_id
        join questions q on q.id = a.question_id
        join study_sessions ss on ss.id = q.session_id
        join materials m on m.id = ss.material_id
        join subjects s on s.id = m.subject_id
        where pl.student_id = e.student_id
          and s.teacher_id = tcb.teacher_id
          and s.course_id = tcb.course_id
          and pl.created_at >= v_period_start
          and pl.created_at < v_period_end
      ), 0) as study_pts
    from teacher_course_budget tcb
    join enrollments e on e.course_id = tcb.course_id
  ),
  with_composite as (
    select
      sc.*,
      (sc.grade_avg / 10.0)
        + (least(sc.study_pts, 500)::numeric / 500.0)
        as composite
    from student_composites sc
  ),
  totals as (
    select
      teacher_id,
      course_id,
      sum(composite * composite) as total_squared
    from with_composite
    group by teacher_id, course_id
  )
  insert into student_payouts (
    period_id, student_id, teacher_id, course_id,
    grade_avg, study_points, composite, amount, rank
  )
  select
    p_period_id,
    wc.student_id,
    wc.teacher_id,
    wc.course_id,
    wc.grade_avg,
    wc.study_pts,
    wc.composite,
    case
      when t.total_squared > 0 then
        round(wc.budget * (wc.composite * wc.composite) / t.total_squared, 2)
      else 0
    end,
    rank() over (
      partition by wc.teacher_id, wc.course_id
      order by wc.composite desc
    )
  from with_composite wc
  join totals t
    on t.teacher_id = wc.teacher_id
   and t.course_id = wc.course_id;

  -- Aggregate to student_scores (pre-cap)
  insert into student_scores (
    period_id, student_id, grade_score, study_points, composite, payout_amount
  )
  select
    p_period_id,
    sp.student_id,
    avg(sp.grade_avg),
    sum(sp.study_points),
    sum(sp.composite),
    sum(sp.amount)
  from student_payouts sp
  where sp.period_id = p_period_id
  group by sp.student_id;

  -- Apply per-student cap and track total excess for rollover
  v_total_excess := 0;

  select coalesce(sum(payout_amount - v_max_payout), 0)
    into v_total_excess
    from student_scores
    where period_id = p_period_id
      and payout_amount > v_max_payout;

  if v_total_excess > 0 then
    -- Scale down each student_payouts row proportionally for students who hit the cap
    update student_payouts sp
      set amount = round(sp.amount * v_max_payout / ss.payout_amount, 2)
      from student_scores ss
      where ss.period_id = p_period_id
        and ss.student_id = sp.student_id
        and sp.period_id = p_period_id
        and ss.payout_amount > v_max_payout;

    update student_scores
      set payout_amount = v_max_payout
      where period_id = p_period_id
        and payout_amount > v_max_payout;

    -- Carry the excess to next period via rollover
    update payout_periods
      set rollover_amount = rollover_amount + v_total_excess
      where id = p_period_id;
  end if;
end;
$$;
