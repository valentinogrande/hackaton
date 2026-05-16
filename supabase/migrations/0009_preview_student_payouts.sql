-- Live payout breakdown for a single student. Same formula as recompute_pools_v2
-- but read-only — the wallet can call this on every page load without writing
-- snapshots. Persisted student_payouts still wins when admin closes the period.

create or replace function public.preview_student_payouts(
  p_student_id uuid,
  p_period_id uuid
)
returns table (
  teacher_id uuid,
  course_id uuid,
  grade_avg numeric,
  study_points integer,
  composite numeric,
  amount numeric,
  rank integer
)
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
  v_teacher_count int;
begin
  select school_id, period, pool_amount, teacher_share
    into v_school_id, v_period, v_pool, v_teacher_share
    from payout_periods where id = p_period_id;

  if v_school_id is null then return; end if;

  v_period_start := (v_period || '-01')::date;
  v_period_end := (v_period_start + interval '1 month')::date;
  v_student_pool := v_pool * (1 - v_teacher_share);

  select count(distinct s.teacher_id)
    into v_teacher_count
    from subjects s
    join courses c on c.id = s.course_id
    where c.school_id = v_school_id
      and s.teacher_id is not null;

  if v_teacher_count = 0 then return; end if;

  return query
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
      (v_student_pool / v_teacher_count)
        / nullif(count(*) over (partition by tc.teacher_id), 0) as budget
    from teacher_courses tc
  ),
  composites as (
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
        + (least(sc.study_pts, 500)::numeric / 500.0) as composite
    from composites sc
  ),
  totals as (
    select
      tc.teacher_id,
      tc.course_id,
      sum(tc.composite * tc.composite) as total_squared
    from with_composite tc
    group by tc.teacher_id, tc.course_id
  ),
  ranked as (
    select
      wc.teacher_id,
      wc.course_id,
      wc.student_id,
      wc.grade_avg,
      wc.study_pts as study_points,
      wc.composite,
      case
        when t.total_squared > 0 then
          round(wc.budget * (wc.composite * wc.composite) / t.total_squared, 2)
        else 0
      end as amount,
      rank() over (
        partition by wc.teacher_id, wc.course_id
        order by wc.composite desc
      )::int as rank
    from with_composite wc
    join totals t
      on t.teacher_id = wc.teacher_id
     and t.course_id = wc.course_id
  )
  select
    r.teacher_id,
    r.course_id,
    r.grade_avg,
    r.study_points,
    r.composite,
    r.amount,
    r.rank
  from ranked r
  where r.student_id = p_student_id
  order by r.amount desc;
end;
$$;
