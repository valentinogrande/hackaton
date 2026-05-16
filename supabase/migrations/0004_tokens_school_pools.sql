-- ============================================================
-- 0004 TOKENS: schools, monthly payout pools, scores, withdrawals
-- Off-chain economy: pool funded by gov + investors, distributed
-- monthly to students proportional to grades + study activity.
-- ============================================================

create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table courses add column school_id uuid references schools(id) on delete cascade;
create index on courses(school_id);

create table payout_periods (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  period text not null,
  pool_amount numeric(12,2) not null default 0,
  teacher_share numeric(4,3) not null default 0.200,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (school_id, period)
);

create table student_scores (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references payout_periods(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  grade_score numeric(6,2) not null default 0,
  study_points integer not null default 0,
  composite numeric(8,2) not null default 0,
  payout_amount numeric(12,2) not null default 0,
  computed_at timestamptz not null default now(),
  unique (period_id, student_id)
);
create index on student_scores(student_id);

create type withdrawal_status as enum ('requested', 'processing', 'paid', 'rejected');

create table withdrawals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  period_id uuid references payout_periods(id) on delete set null,
  amount numeric(12,2) not null,
  destination jsonb,
  status withdrawal_status not null default 'requested',
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  notes text
);
create index on withdrawals(student_id, requested_at desc);
create index on withdrawals(status);

alter table schools enable row level security;
alter table payout_periods enable row level security;
alter table student_scores enable row level security;
alter table withdrawals enable row level security;

create policy schools_read on schools for select using (auth.uid() is not null);
create policy schools_admin on schools for all
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy periods_read on payout_periods for select using (auth.uid() is not null);
create policy periods_admin on payout_periods for all
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy scores_self on student_scores for select using (
  student_id = auth.uid() or public.current_role() in ('admin','teacher')
);

create policy withdrawals_self on withdrawals for select
  using (student_id = auth.uid() or public.current_role() = 'admin');
create policy withdrawals_self_insert on withdrawals for insert with check (student_id = auth.uid());
create policy withdrawals_admin_update on withdrawals for update
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create or replace function public.recompute_student_scores(p_period_id uuid)
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
  v_total_composite numeric;
begin
  select school_id, period, pool_amount, teacher_share
    into v_school_id, v_period, v_pool, v_teacher_share
    from payout_periods where id = p_period_id;

  v_period_start := (v_period || '-01')::date;
  v_period_end := (v_period_start + interval '1 month')::date;
  v_student_pool := v_pool * (1 - v_teacher_share);

  delete from student_scores where period_id = p_period_id;

  insert into student_scores (period_id, student_id, grade_score, study_points, composite)
  select
    p_period_id,
    p.id,
    coalesce((
      select avg(g.value) from grades g
      join subjects s on s.id = g.subject_id
      join courses c on c.id = s.course_id
      where g.student_id = p.id
        and c.school_id = v_school_id
        and g.created_at >= v_period_start
        and g.created_at < v_period_end
    ), 0),
    coalesce((
      select sum(pl.delta) from points_ledger pl
      where pl.student_id = p.id
        and pl.created_at >= v_period_start
        and pl.created_at < v_period_end
    ), 0),
    0
  from profiles p
  where p.role = 'student'
    and exists (
      select 1 from enrollments e
      join courses c on c.id = e.course_id
      where e.student_id = p.id and c.school_id = v_school_id
    );

  update student_scores
    set composite = (grade_score * 0.6) + (least(study_points, 1000) * 0.04)
    where period_id = p_period_id;

  select coalesce(sum(composite), 0) into v_total_composite
    from student_scores where period_id = p_period_id;

  if v_total_composite > 0 then
    update student_scores
      set payout_amount = round(v_student_pool * composite / v_total_composite, 2)
      where period_id = p_period_id;
  end if;
end;
$$;

insert into schools (name) values ('StudyPay Demo School');
