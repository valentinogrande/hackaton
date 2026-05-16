-- ============================================================
-- 0006 POOLS: hierarchical pool distribution
-- school pool -> teacher pools -> per-course budgets -> students
-- Competition is per course (quadratic-proportional to composite).
-- ============================================================

create table teacher_pools (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references payout_periods(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  pool_amount numeric(12,2) not null default 0,
  teacher_bonus numeric(12,2) not null default 0,
  computed_at timestamptz not null default now(),
  unique (period_id, teacher_id)
);
create index on teacher_pools(teacher_id);

create table student_payouts (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references payout_periods(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  grade_avg numeric(6,2) not null default 0,
  study_points integer not null default 0,
  composite numeric(8,4) not null default 0,
  amount numeric(12,2) not null default 0,
  rank integer,
  computed_at timestamptz not null default now(),
  unique (period_id, student_id, teacher_id, course_id)
);
create index on student_payouts(student_id, period_id);
create index on student_payouts(teacher_id, period_id);
create index on student_payouts(course_id, period_id);

alter table teacher_pools enable row level security;
alter table student_payouts enable row level security;

create policy teacher_pools_read on teacher_pools
  for select using (teacher_id = auth.uid() or public.current_role() = 'admin');

create policy student_payouts_read on student_payouts
  for select using (
    student_id = auth.uid()
    or teacher_id = auth.uid()
    or public.current_role() = 'admin'
  );

drop function if exists public.recompute_student_scores(uuid);

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
begin
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
end;
$$;
