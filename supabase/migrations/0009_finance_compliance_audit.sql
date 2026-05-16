-- ============================================================
-- 0009 FINANCE: audit events, compliance flags, student holds
-- Immutable log + automatic UIF threshold detection.
-- ============================================================

create type audit_kind as enum (
  'capital_in',
  'fci_subscription',
  'fci_redemption',
  'yield_computed',
  'yield_distributed',
  'student_payout',
  'investor_return',
  'operation_expense',
  'withdrawal_requested',
  'withdrawal_paid',
  'withdrawal_rejected',
  'compliance_flag',
  'student_hold',
  'kyc_change'
);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  kind audit_kind not null,
  actor_id uuid references profiles(id) on delete set null,
  subject_type text not null,
  subject_id uuid,
  amount numeric(14,2),
  currency currency_code,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on audit_events(kind, created_at desc);
create index on audit_events(subject_type, subject_id);
create index on audit_events(actor_id, created_at desc);

create type compliance_flag_kind as enum (
  'uif_threshold',
  'gafi_jurisdiction',
  'kyc_expired',
  'anomaly_score',
  'manual_review'
);
create type compliance_flag_status as enum (
  'open',
  'reviewed',
  'reported',
  'closed'
);
create type compliance_severity as enum ('low', 'medium', 'high');

create table compliance_flags (
  id uuid primary key default gen_random_uuid(),
  kind compliance_flag_kind not null,
  status compliance_flag_status not null default 'open',
  severity compliance_severity not null default 'medium',
  subject_type text not null,
  subject_id uuid,
  payload jsonb not null default '{}',
  resolved_by uuid references profiles(id) on delete set null,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now()
);
create index on compliance_flags(status, created_at desc);
create index on compliance_flags(kind);
create index on compliance_flags(subject_type, subject_id);

create table student_holds (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  released_by uuid references profiles(id) on delete set null
);
create index on student_holds(student_id, active);

alter table audit_events enable row level security;
alter table compliance_flags enable row level security;
alter table student_holds enable row level security;

-- Audit events: admins read all; nobody (not even admin) updates/deletes.
create policy audit_events_admin_read on audit_events for select
  using (public.current_role() = 'admin');
create policy audit_events_admin_insert on audit_events for insert
  with check (public.current_role() = 'admin');

create policy compliance_flags_admin_all on compliance_flags for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy student_holds_admin_all on student_holds for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
create policy student_holds_self_read on student_holds for select
  using (student_id = auth.uid());

-- ============================================================
-- Automatic compliance detection on capital_contributions
-- ============================================================

create or replace function public.detect_uif_threshold()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_sum numeric;
  v_threshold numeric := 50000;
begin
  if new.status <> 'confirmed' or new.amount_usd is null then
    return new;
  end if;

  -- Single-contribution threshold
  if new.amount_usd >= v_threshold then
    insert into compliance_flags (kind, severity, subject_type, subject_id, payload)
    values (
      'uif_threshold',
      'high',
      'capital_contributions',
      new.id,
      jsonb_build_object(
        'reason', 'single_contribution_over_threshold',
        'amount_usd', new.amount_usd,
        'threshold_usd', v_threshold,
        'source_id', new.source_id
      )
    );
  end if;

  -- 30-day rolling sum per source
  select coalesce(sum(amount_usd), 0)
    into v_window_sum
    from capital_contributions
    where source_id = new.source_id
      and status = 'confirmed'
      and confirmed_at >= (now() - interval '30 days');

  if v_window_sum >= v_threshold and new.amount_usd < v_threshold then
    insert into compliance_flags (kind, severity, subject_type, subject_id, payload)
    values (
      'uif_threshold',
      'high',
      'capital_sources',
      new.source_id,
      jsonb_build_object(
        'reason', 'rolling_30d_over_threshold',
        'window_sum_usd', v_window_sum,
        'threshold_usd', v_threshold,
        'trigger_contribution_id', new.id
      )
    );
  end if;

  return new;
end;
$$;

create trigger capital_contributions_uif_detect
  after insert or update of status on capital_contributions
  for each row execute function public.detect_uif_threshold();

-- KYC expiration flag when kyc_status transitions to 'expired'
create or replace function public.detect_kyc_expired()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kyc_status = 'expired' and (tg_op = 'INSERT' or old.kyc_status <> 'expired') then
    insert into compliance_flags (kind, severity, subject_type, subject_id, payload)
    values (
      'kyc_expired',
      'medium',
      'capital_sources',
      new.id,
      jsonb_build_object('source_name', new.display_name)
    );
  end if;
  return new;
end;
$$;

create trigger capital_sources_kyc_detect
  after insert or update of kyc_status on capital_sources
  for each row execute function public.detect_kyc_expired();
