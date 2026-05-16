-- ============================================================
-- 0007 FINANCE: capital sources, contributions, FCI subscriptions
-- Layer that funds the school pool via the Foundation's investment vehicle.
-- See docs/superpowers/specs/2026-05-16-modulo-financiero-design.md
-- ============================================================

create type capital_source_kind as enum (
  'government',
  'private_individual',
  'private_corporate',
  'impact_fund'
);

create type kyc_status as enum ('pending', 'approved', 'rejected', 'expired');

create type currency_code as enum ('ARS', 'USD');

create type contribution_status as enum (
  'pending',
  'confirmed',
  'failed',
  'reversed'
);

create table capital_sources (
  id uuid primary key default gen_random_uuid(),
  kind capital_source_kind not null,
  display_name text not null,
  legal_name text,
  tax_id text,
  country_code text not null default 'AR',
  kyc_status kyc_status not null default 'pending',
  kyc_documents jsonb not null default '{}',
  gafi_check_passed boolean not null default false,
  contact jsonb not null default '{}',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
create index on capital_sources(kind);
create index on capital_sources(kyc_status);
create index on capital_sources(active);

create table capital_contributions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references capital_sources(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  currency currency_code not null,
  amount_usd numeric(14,2),
  fx_rate numeric(14,6),
  status contribution_status not null default 'pending',
  transfer_hash text,
  received_at timestamptz,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index on capital_contributions(source_id);
create index on capital_contributions(status);
create index on capital_contributions(confirmed_at desc);

create table fci_subscriptions (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid references capital_contributions(id) on delete set null,
  fci_code text not null,
  amount_usd numeric(14,2) not null check (amount_usd > 0),
  shares numeric(18,8) not null check (shares > 0),
  share_price numeric(14,6) not null check (share_price > 0),
  subscribed_at timestamptz not null default now()
);
create index on fci_subscriptions(fci_code);
create index on fci_subscriptions(contribution_id);

alter table capital_sources enable row level security;
alter table capital_contributions enable row level security;
alter table fci_subscriptions enable row level security;

create policy capital_sources_admin_all on capital_sources for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy capital_contributions_admin_all on capital_contributions for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy fci_subscriptions_admin_all on fci_subscriptions for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
