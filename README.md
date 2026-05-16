# StudyPay — Hackathon

Plataforma de estudio con IA y pagos al alumno. Roles: **admin**, **teacher**, **student**.

## Idea de producto

- El colegio (o el sistema) recibe un pool mensual de fondos (gobierno + inversores).
- Profes suben PDFs. Gemini genera quizzes / flashcards / fill-blank / preguntas abiertas a partir del PDF (preguntas nuevas cada vez, no banco fijo).
- Cada respuesta correcta suma puntos al alumno + cuenta para sus calificaciones.
- A fin de mes, el pool del colegio se reparte entre los alumnos proporcional a un score (notas + actividad de estudio). Los alumnos retiran el dinero en fiat.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn (base-nova)
- Supabase: Auth + Postgres + Storage + RLS
- Google Gemini para generación de preguntas
- Deploy Vercel

## Setup

```bash
git clone <repo>
cd hackaton
npm install
cp .env.example .env.local      # completar SUPABASE_SERVICE_ROLE_KEY y GEMINI_API_KEY
npm run dev
```

→ http://localhost:3000. En `/register` elegí rol = **admin** para crearte una cuenta de admin.

## División por branches

| Dev | Branch | Qué archivos toca |
|---|---|---|
| **Back** | `feat/back` | `supabase/migrations/*`, `lib/supabase/*`, `lib/gemini.ts`, `lib/data/*.ts`, todos los `actions.ts`, `app/api/**/route.ts`, `middleware.ts` |
| **Front** | `feat/front` | Todos los `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, todo en `components/` (excepto `components/tokens/`), `app/globals.css` |
| **Tokens** | `feat/tokens` | `app/(student)/wallet/*`, `app/(admin)/admin/payouts/*` (lógica), `lib/tokens/*`, `components/tokens/*`, `app/api/tokens/**/route.ts`, migrations en `supabase/migrations/00XX_tokens_*.sql` (acordar con Back) |

### Cómo evitan pisarse

1. **Contratos primero.** Todos los `actions.ts` y `route.ts` ya están como **stubs** con la firma definida y `TODO` adentro. Eso significa:
   - Front puede importar y construir UI ya (las acciones tiran error al ejecutar, pero la app compila y renderiza).
   - Back rellena los TODOs sin romper a Front.
2. **Una sola persona toca un archivo.** Si Front necesita un dato nuevo del DB, le pide a Back que extienda un helper en `lib/data/*.ts` o cree una server action — no escribe queries directo.
3. **Migrations las maneja Back.** Si Tokens necesita una tabla nueva, mandan SQL a Back y Back la aplica.
4. **shadcn**: si alguien necesita un componente nuevo, `npx shadcn@latest add <componente>` agrega un archivo nuevo en `components/ui/` → sin conflicto.
5. **PRs chicos a `main`** apenas algo funcione.

## Estructura

```
app/
├── (auth)/              login + register + signOut             [BACK listo]
├── (admin)/admin/
│   ├── users/           cambio de rol                          [BACK listo, FRONT puede mejorar UI]
│   ├── courses/         CRUD                                   [BACK listo]
│   ├── subjects/        CRUD + asignar profe                   [BACK listo]
│   └── payouts/         crear período, ver retiros             [stubs — TOKENS implementa lógica, FRONT la UI]
├── (teacher)/teacher/
│   ├── materials/       subir PDF                              [stubs — BACK + FRONT]
│   ├── grades/          cargar notas                           [stubs — BACK + FRONT]
│   └── attendance/      pasar asistencia                       [stubs — BACK + FRONT]
├── (student)/student/
│   ├── (home)           balance + accesos                      [FRONT pulir]
│   ├── estudiar/        sesión de estudio Gemini               [BACK + FRONT]
│   ├── notas/           read-only                              [listo]
│   ├── asistencia/      read-only                              [listo]
│   └── wallet/          score, payout estimado, retiros        [TOKENS lógica + FRONT UI]
└── api/
    ├── gemini/generate/ POST                                   [BACK]
    └── tokens/recompute/ POST                                  [TOKENS]

lib/
├── supabase/            clients (browser + server + admin)     [BACK listo]
├── database.types.ts    tipos generados desde Supabase
├── gemini.ts            extractTextFromPdf, generateQuestions  [BACK stubs]
├── data/                queries reusables                      [BACK]
│   ├── materials.ts
│   ├── grades.ts
│   ├── attendance.ts
│   ├── scores.ts
│   └── withdrawals.ts
└── tokens/
    └── economy.ts       puntos por respuesta + fórmulas        [TOKENS]

components/
├── ui/                  shadcn
└── role-nav.tsx         sidebar compartida                     [BACK listo]

supabase/migrations/     [solo BACK]
```

## Modelo de tokens / pagos

**Tablas:**
- `schools` — para multi-tenant (MVP: 1 sola, "StudyPay Demo School")
- `payout_periods` — un período mensual por colegio (`pool_amount`, `teacher_share`, status: open/closed/paid)
- `student_scores` — snapshot por alumno por período (grade_score, study_points, composite, payout_amount)
- `withdrawals` — solicitudes de retiro (status: requested/processing/paid/rejected)

**Flujo:**
1. Admin crea un `payout_period` con un `pool_amount` (lo que el colegio recibió ese mes).
2. Durante el mes, alumnos estudian (sube `points_ledger`) y profes cargan notas.
3. Al cerrar el mes, admin llama `recomputeScores(periodId)` → función SQL `recompute_student_scores` calcula composite y reparte el `student_pool = pool * (1 - teacher_share)` proporcional.
4. Alumno ve su `payout_amount` en `/student/wallet` y solicita retiro.
5. Admin marca el retiro como pagado (la transferencia real es manual, off-band).

**Fórmula actual (Dev Tokens la ajusta en SQL y `lib/tokens/economy.ts`):**

```
composite = grade_score * 0.6 + min(study_points, 1000) * 0.04
share     = composite / sum(composite)
payout    = student_pool * share
```

## Otorgar puntos (BACK + TOKENS)

```ts
import { createAdminClient } from "@/lib/supabase/server";
const admin = createAdminClient();
await admin.from("points_ledger").insert({
  student_id: userId,
  delta: 10,
  reason: "correct_answer",
  ref_id: answerId,
});
// El trigger actualiza profiles.points_balance.
```

## Regenerar tipos cuando cambie el schema

```bash
# Back lo hace después de aplicar una migration
npx supabase gen types typescript --project-id mmcahdqmjwftuygjexsz > lib/database.types.ts
```

## Deploy a Vercel

1. Conectar repo en dashboard.vercel.com.
2. Setear `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`.
3. Push a `main` = deploy.
