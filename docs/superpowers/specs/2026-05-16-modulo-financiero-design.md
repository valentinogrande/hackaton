# StudyPay — Diseño del módulo financiero

Fecha: 2026-05-16
Autor: Dev Finanzas (con Claude Code)
Estado: aprobado para implementación

## 1. Contexto

StudyPay distribuye un pool mensual de un colegio a alumnos según una métrica educativa (composite = notas + actividad de estudio). El sistema actual asume que `payout_periods.pool_amount` es un input manual del admin. Este módulo agrega la **capa financiera** que faltaba: define de dónde sale ese pool, cómo se gobierna, cómo se reparte el rendimiento entre alumnos / inversores / operación, cómo se ejecutan los pagos reales, y cómo queda auditado todo el flujo.

Stack vigente del proyecto: Next.js 16 App Router + TypeScript + Supabase (Auth + Postgres + Storage + RLS) + Gemini + Vercel. El módulo financiero respeta este stack — no se introduce FastAPI, Prisma ni Python (el brief original asumía otro stack; se descarta).

## 2. Principios de diseño

- **Aditivo, no destructivo.** La lógica educativa actual (`recompute_pools_v2`, distribución cuadrática per-curso, teacher pools) se preserva intacta. La capa financiera alimenta el pool que esa lógica consume.
- **Una sola fuente de verdad.** Cada movimiento de dinero queda registrado en una tabla inmutable (`audit_events`). Tablas operativas tienen triggers que disparan ese registro.
- **Idempotencia.** Cierre mensual, recompute, distribución de retornos: todos chequean si ya corrieron para ese ciclo antes de mutar.
- **Boundary del MVP.** Lo que es código vive acá; lo legal (constitución de Fundación, manuales PLAFT, convenios) queda fuera del alcance — el sistema solo persiste los datos necesarios para que el compliance officer haga su trabajo.
- **Solo backend.** No se modifica ningún `page.tsx`, `layout.tsx`, ni archivos de `components/`. Toda interacción nueva pasa por server actions o endpoints REST que el frontend consume cuando esté listo.

## 3. Arquitectura — capas

```
┌───────────────────────────────────────────────────────────┐
│ Capital sources  (gov / private_ind / private_corp / fund)│
│   ↓ contributions (ARS o USD)                             │
├───────────────────────────────────────────────────────────┤
│ FCI Subscriptions (mock; futuro: API sociedad de bolsa)   │
│   ↓ NAV diario (oracle)                                   │
├───────────────────────────────────────────────────────────┤
│ Yield Cycle (mensual)                                     │
│   ├── 60% → Student Pool   → payout_periods.pool_amount   │
│   │         └── recompute_pools_v2 (existente)            │
│   │              ├── student_pool × (1-teacher_share)     │
│   │              │    → distribuye cuadrático per-curso   │
│   │              └── student_pool × teacher_share         │
│   │                   → bonus fijo a profes               │
│   ├── 30% → Investor Returns (proporcional al aporte)     │
│   └── 10% → Operation Expenses                            │
├───────────────────────────────────────────────────────────┤
│ Payment Gateway (MercadoPago test, vía MCP cuando exista) │
│   ↓ withdrawals.requested → processing → paid             │
└───────────────────────────────────────────────────────────┘
```

## 4. Modelo de datos nuevo

Tres migrations: `0007_finance_capital_sources.sql`, `0008_finance_yield_distribution.sql`, `0009_finance_compliance_audit.sql`.

### 4.1 Capital sources & contributions

```sql
create type capital_source_kind as enum (
  'government', 'private_individual', 'private_corporate', 'impact_fund'
);
create type kyc_status as enum ('pending', 'approved', 'rejected', 'expired');
create type currency as enum ('ARS', 'USD');
create type contribution_status as enum ('pending', 'confirmed', 'failed', 'reversed');

create table capital_sources (
  id uuid primary key default gen_random_uuid(),
  kind capital_source_kind not null,
  display_name text not null,
  legal_name text,
  tax_id text,
  country_code text default 'AR',
  kyc_status kyc_status not null default 'pending',
  kyc_documents jsonb default '{}',
  gafi_check_passed boolean default false,
  contact jsonb default '{}',
  notes text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table capital_contributions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references capital_sources(id) on delete restrict,
  amount numeric(14,2) not null,
  currency currency not null,
  amount_usd numeric(14,2),  -- calculado al confirmar
  fx_rate numeric(14,6),     -- ARS por USD si aplica
  status contribution_status not null default 'pending',
  transfer_hash text,         -- referencia del banco/wire
  received_at timestamptz,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index on capital_contributions(source_id);
create index on capital_contributions(status);

create table fci_subscriptions (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid references capital_contributions(id) on delete set null,
  fci_code text not null,           -- 'MM_USD' | 'RF_USD' | 'CASH_USD'
  amount_usd numeric(14,2) not null,
  shares numeric(18,8) not null,
  share_price numeric(14,6) not null,
  subscribed_at timestamptz not null default now()
);
create index on fci_subscriptions(fci_code);
```

### 4.2 Yield cycles & distribution

```sql
create type yield_cycle_status as enum (
  'open', 'computed', 'distributed', 'closed', 'reversed'
);

create table yield_cycles (
  id uuid primary key default gen_random_uuid(),
  period text not null unique,           -- YYYY-MM
  status yield_cycle_status not null default 'open',
  opening_aum_usd numeric(14,2) not null default 0,
  closing_aum_usd numeric(14,2) not null default 0,
  apy_annualized numeric(6,4) not null default 0.043, -- 4.3%
  gross_yield_usd numeric(14,2) not null default 0,
  fees_usd numeric(14,2) not null default 0,
  net_yield_usd numeric(14,2) not null default 0,
  fx_rate_ars_usd numeric(14,6),
  -- Allocation parameters (default 60/30/10, overrideables)
  student_share numeric(4,3) not null default 0.600,
  investor_share numeric(4,3) not null default 0.300,
  operation_share numeric(4,3) not null default 0.100,
  computed_at timestamptz,
  distributed_at timestamptz,
  closed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  check (student_share + investor_share + operation_share <= 1.001)
);

create table investor_returns (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references yield_cycles(id) on delete cascade,
  source_id uuid not null references capital_sources(id) on delete cascade,
  aum_share numeric(8,6) not null,        -- fracción del pool que aportó este inversor
  amount_usd numeric(14,2) not null,
  amount_ars numeric(14,2),
  status text not null default 'pending', -- 'pending' | 'paid' | 'reinvested'
  paid_at timestamptz,
  unique (cycle_id, source_id)
);
create index on investor_returns(source_id);

create table operation_expenses (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references yield_cycles(id) on delete set null,
  category text not null,   -- 'audit' | 'compliance' | 'platform' | 'banking' | 'other'
  description text,
  amount_usd numeric(14,2) not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Linkear payout_periods con su cycle origen
alter table payout_periods add column cycle_id uuid references yield_cycles(id) on delete set null;
alter table payout_periods add column funded_automatically boolean not null default false;
create index on payout_periods(cycle_id);
```

### 4.3 Payments (MercadoPago)

```sql
create type payment_provider as enum ('mercadopago', 'manual', 'mock');
create type payment_status as enum (
  'pending', 'submitted', 'approved', 'rejected', 'refunded', 'failed'
);

create table payment_transactions (
  id uuid primary key default gen_random_uuid(),
  withdrawal_id uuid not null references withdrawals(id) on delete cascade,
  provider payment_provider not null,
  provider_payment_id text,
  amount numeric(12,2) not null,
  currency currency not null default 'ARS',
  status payment_status not null default 'pending',
  destination_snapshot jsonb not null,    -- copia inmutable del destino al momento del pago
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
```

### 4.4 Compliance & audit

```sql
create type audit_kind as enum (
  'capital_in', 'fci_subscription', 'fci_redemption',
  'yield_computed', 'yield_distributed',
  'student_payout', 'investor_return', 'operation_expense',
  'withdrawal_requested', 'withdrawal_paid', 'withdrawal_rejected',
  'compliance_flag', 'student_hold', 'kyc_change'
);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  kind audit_kind not null,
  actor_id uuid references profiles(id) on delete set null,
  subject_type text not null,
  subject_id uuid,
  amount numeric(14,2),
  currency currency,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on audit_events(kind, created_at desc);
create index on audit_events(subject_type, subject_id);

create type compliance_flag_kind as enum (
  'uif_threshold', 'gafi_jurisdiction', 'kyc_expired',
  'anomaly_score', 'manual_review'
);
create type compliance_flag_status as enum ('open', 'reviewed', 'reported', 'closed');

create table compliance_flags (
  id uuid primary key default gen_random_uuid(),
  kind compliance_flag_kind not null,
  status compliance_flag_status not null default 'open',
  severity text not null default 'medium', -- low|medium|high
  subject_type text not null,
  subject_id uuid,
  payload jsonb default '{}',
  resolved_by uuid references profiles(id) on delete set null,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now()
);
create index on compliance_flags(status, created_at);

create table student_holds (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  released_at timestamptz
);
create index on student_holds(student_id, active);
```

## 5. RLS — política por tabla

- `capital_sources`, `capital_contributions`, `fci_subscriptions`, `yield_cycles`, `operation_expenses`, `compliance_flags`, `student_holds`, `audit_events`: **solo admin** lee y escribe.
- `investor_returns`: admin lee todo; un usuario podría leer las suyas si ese usuario está vinculado a un `capital_source` (vínculo opcional vía `profiles.capital_source_id`, no se implementa ahora — los inversores no son `profiles` todavía).
- `payment_transactions`: admin lee todo; el alumno dueño del withdrawal puede leer las suyas vía la relación.

## 6. Yield oracle (cómo se calcula automáticamente)

Interfaz: `lib/finance/yield-oracle.ts`

```ts
export interface YieldOracle {
  computeCycle(periodYYYYMM: string): Promise<YieldComputation>;
}

export type YieldComputation = {
  opening_aum_usd: number;
  closing_aum_usd: number;
  gross_yield_usd: number;
  fees_usd: number;
  net_yield_usd: number;
  apy_used: number;
  source: 'configured_apy' | 'live_nav';
};
```

**Implementación MVP** — `ConfiguredAPYOracle`:
- Lee `opening_aum_usd` = suma de `capital_contributions` confirmadas al inicio del mes.
- Aplica APY configurado (default `0.043` = 4.3%).
- Gross monthly yield = `aum × (apy / 12)`.
- Fees = 1.5% anual del AUM / 12.
- Net yield = gross - fees.
- `closing_aum_usd` = opening + net_yield (capital + reinversión del yield no distribuido todavía).

**Implementación futura** — `LiveNAVOracle`:
- Consultará API de sociedad de bolsa (Allaria/Balanz/IOL) para NAV diario real.
- Stub creado, no implementado: lanza `NotImplementedError`.

El admin elige cuál usar vía env `FINANCE_YIELD_ORACLE=configured_apy|live_nav`. Default: `configured_apy`.

## 7. Reglas de distribución

### 7.1 Cierre mensual (idempotente)

```
1. Crear/recuperar yield_cycles row con period=YYYY-MM, status='open'
2. Si status != 'open' → abortar (ya procesado)
3. Llamar YieldOracle.computeCycle(period) → setear opening/closing/gross/fees/net
4. Marcar status='computed'
5. Distribución:
   a. student_total = net_yield_usd × student_share (default 0.6)
   b. investor_total = net_yield_usd × investor_share (default 0.3)
   c. operation_total = net_yield_usd × operation_share (default 0.1)
6. Para cada school activo:
     student_pool_per_school = student_total / N_schools  (MVP: 1 sola)
     upsert payout_periods(school_id, period) con
       pool_amount = student_pool_per_school × FX(USD→ARS),
       cycle_id = yield_cycle.id,
       funded_automatically = true
7. Para cada capital_source con contributions confirmadas vigentes:
     aum_share = source_total / total_aum
     return_usd = investor_total × aum_share
     insert investor_returns(cycle_id, source_id, aum_share, amount_usd)
8. Marcar status='distributed', set distributed_at
9. Disparar recompute_pools_v2 para cada payout_period nuevo
10. audit_events ← yield_distributed + uno por cada payout/return creado
```

### 7.2 Tope global de pago al alumno

Constante en `lib/finance/economy.ts`:

```ts
export const MAX_STUDENT_PAYOUT_PER_PERIOD_ARS = 75_000; // ~USD 50 al cambio
```

Aplicado dentro de `recompute_pools_v2`: si `student_payouts.amount > MAX`, se trunca y el excedente se acumula en `payout_periods.rollover_amount` (nueva columna) para el próximo período.

Migration `0008` agrega:
```sql
alter table payout_periods add column rollover_amount numeric(12,2) not null default 0;
```

La función `recompute_pools_v2` se actualiza para aplicar el cap. Cambio mínimo, no destructivo del modelo de scoring.

## 8. Payment Gateway

Interfaz: `lib/finance/payment-gateway.ts`

```ts
export interface PaymentGateway {
  payToCvu(opts: PayOpts): Promise<PayResult>;
  verifyPayment(providerPaymentId: string): Promise<PaymentStatus>;
  handleWebhook(body: unknown, headers: Headers): Promise<WebhookResult>;
}

export type PayOpts = {
  destinationCvu: string;
  amount: number;
  currency: 'ARS';
  externalReference: string;
  description: string;
};
```

**Implementaciones:**
- `MockPaymentGateway` (default en MVP, hasta que el MCP esté): simula respuesta exitosa, registra en `payment_transactions` con `provider='mock'`.
- `MercadoPagoGateway` (stub a completar cuando esté el MCP): provider='mercadopago'. Punto exacto de implementación documentado.

Selección vía env `FINANCE_PAYMENT_GATEWAY=mock|mercadopago`. Default: `mock`.

**Flujo `markWithdrawalPaid` actualizado:**
```
1. Cargar withdrawal, validar status='requested'|'processing'
2. Validar destination.value (CBU/CVU regex 22 dígitos + checksum)
3. Validar !student_holds.active para ese student_id
4. Crear payment_transactions row con status='pending'
5. gateway.payToCvu(...) → recibe provider_payment_id
6. Actualizar transaction con status='submitted', provider_payment_id
7. Actualizar withdrawals.status='processing'
8. audit_events ← withdrawal_paid (intent)
```

Webhook MP en `app/api/finance/webhooks/mercadopago/route.ts`:
```
1. Verificar HMAC signature (header x-signature, secret MP_WEBHOOK_SECRET)
2. Parsear notification
3. gateway.verifyPayment(providerPaymentId) → status real
4. Actualizar payment_transactions y withdrawals según status:
     approved → withdrawals.paid + processed_at = now
     rejected → withdrawals.rejected, transaction.error_message
5. audit_events ← según resultado
```

## 9. API surface

Endpoints REST (todos en `app/api/finance/`):

**Capital management** (admin only):
- `POST /api/finance/capital-sources` — crear inversor/fuente
- `PATCH /api/finance/capital-sources/:id` — update KYC, datos
- `POST /api/finance/contributions` — registrar aporte (status='pending')
- `POST /api/finance/contributions/:id/confirm` — confirmar (calcula amount_usd, dispara fci_subscription)

**Yield cycle** (admin only):
- `POST /api/finance/cycles/run` — corre el cierre mensual (body: `{ period: 'YYYY-MM' }`)
- `GET /api/finance/cycles/:id` — estado del ciclo
- `POST /api/finance/cycles/:id/distribute-investor-returns` — marca returns como `'paid'` (manual hasta que haya rail)

**Cron** (protegido con header `x-cron-secret`):
- `POST /api/finance/cron/monthly-close` — dispara `cycles/run` para el período corriente

**Payments**:
- `POST /api/finance/webhooks/mercadopago` — webhook MP
- `POST /api/finance/withdrawals/:id/pay` — dispara pago (admin only)

**Reporting**:
- `GET /api/finance/dashboard/admin` — KPIs: AUM total, yield del mes, pendientes
- `GET /api/finance/dashboard/investor?source_id=...` — retornos, IRR estimado
- `GET /api/finance/compliance/flags` — alertas abiertas

## 10. Compliance — detector automático

Triggers en `audit_events`:
- INSERT en `capital_contributions` con `amount_usd > 50000` o suma trailing-30d > 50000 → INSERT en `compliance_flags(kind='uif_threshold')`.
- INSERT en `capital_sources` con `country_code` en lista GAFI → flag `gafi_jurisdiction`.
- UPDATE en `capital_sources` con `kyc_status='expired'` → flag `kyc_expired`.

La lista GAFI vive en `lib/finance/compliance.ts` como constante (actualizable a mano).

## 11. Validación CBU/CVU

Función: `lib/finance/cbu.ts`

```ts
export function isValidCbuCvu(s: string): boolean {
  if (!/^\d{22}$/.test(s)) return false;
  // Checksum estándar BCRA: dos dígitos verificadores
  return verifyChecksum(s);
}
```

Aplicada en `requestWithdrawal` y en `markWithdrawalPaid` antes de disparar el pago.

## 12. Variables de entorno nuevas

```
# Finanzas
FINANCE_YIELD_ORACLE=configured_apy
FINANCE_PAYMENT_GATEWAY=mock
FINANCE_DEFAULT_APY=0.043
FINANCE_FEE_RATE=0.015
FINANCE_FX_ARS_PER_USD=1300

# Cron
CRON_SECRET=

# MercadoPago (cuando se active)
MP_ACCESS_TOKEN=
MP_WEBHOOK_SECRET=
```

Se agregan a `.env.example`.

## 13. Estructura de archivos

```
supabase/migrations/
  0007_finance_capital_sources.sql
  0008_finance_yield_distribution.sql
  0009_finance_compliance_audit.sql

lib/finance/
  economy.ts            # constantes + helpers de cálculo
  yield-oracle.ts       # interfaz + ConfiguredAPYOracle + LiveNAVOracle (stub)
  payment-gateway.ts    # interfaz + MockPaymentGateway + MercadoPagoGateway (stub)
  compliance.ts         # GAFI list, detectores
  cbu.ts                # validación CBU/CVU
  ledger.ts             # helpers para escribir audit_events
  cycle.ts              # orquestación del cierre mensual

lib/data/finance/
  capital.ts            # queries de sources, contributions
  yield.ts              # queries de cycles, returns
  payouts.ts            # queries de student_payouts agregadas

app/api/finance/
  capital-sources/route.ts
  capital-sources/[id]/route.ts
  contributions/route.ts
  contributions/[id]/confirm/route.ts
  cycles/run/route.ts
  cycles/[id]/route.ts
  cycles/[id]/distribute-investor-returns/route.ts
  cron/monthly-close/route.ts
  webhooks/mercadopago/route.ts
  withdrawals/[id]/pay/route.ts
  dashboard/admin/route.ts
  dashboard/investor/route.ts
  compliance/flags/route.ts

app/(admin)/admin/payouts/actions.ts   # extender markWithdrawalPaid (no se crea, se edita)
.env.example                            # agregar vars (se edita)
```

## 14. Testing

- Funciones SQL críticas (`recompute_pools_v2` con tope, distribución de yield): test SQL en `supabase/tests/` con datos seed.
- Helpers de `lib/finance/`: tests unitarios con Vitest (`*.test.ts` al lado del archivo).
- Endpoints: smoke tests con `supertest` o fetch directo en `__tests__/` (opcional MVP).

## 15. Deploy

- Migrations: aplicar vía Supabase MCP o CLI (`supabase db push`).
- Vercel Cron en `vercel.json`:
  ```json
  {
    "crons": [
      { "path": "/api/finance/cron/monthly-close", "schedule": "0 6 28 * *" }
    ]
  }
  ```
- Env vars seteadas en Vercel Dashboard antes de prom.

## 16. Fuera de alcance (explícito)

- Constitución legal de Fundación, SAS, apertura de cuentas comitente.
- Manual PLAFT, política KYC formal, plan de cuentas contable.
- Convenios con gobierno provincial / colegios / empresas / fondos de impacto.
- Conversión MEP real (mock: admin registra fx_rate al confirmar contribución).
- Generación de certificados fiscales AFIP / reportes formales CNV / envío ROS a UIF (la app expone los datos; el envío lo hace el compliance officer).
- Frontend de cualquier tipo (no se toca front per pedido del usuario).
- Integración real con sociedad de bolsa (FCI subscriptions son mock).

## 17. Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| Race conditions en cierre mensual | Lock pesimista en `yield_cycles` por period; status machine estricta |
| Doble pago por reintento de webhook | `unique(provider, provider_payment_id)` + idempotency en `markWithdrawalPaid` |
| Cap de tope rompe ordering del scoring | El cap se aplica DESPUÉS del cálculo del composite, no antes; ranking se mantiene |
| Cambio de FX entre cómputo y pago | `payout_periods.pool_amount` se setea al cierre con fx_rate de ese momento; queda fijo |
| Migración 0006 ya creó `recompute_pools_v2` | La modificamos in-place vía `create or replace`; preservamos firma |

## 18. Checkpoints de validación

- ✅ Diseño revisado por Dev Finanzas — este documento
- ☐ Migrations aplicadas en dev DB, schema diff revisado
- ☐ Cierre mensual ejecutado con datos seed → verificación manual de 60/30/10
- ☐ Pago mock end-to-end: requestWithdrawal → markWithdrawalPaid → audit_events
- ☐ Compliance: contribution de USD 60k → flag automático creado
- ☐ Cuando MP MCP esté disponible: reemplazar MockGateway por MercadoPagoGateway, smoke test con test credentials
