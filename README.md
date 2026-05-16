# StudyPay — Hackathon

Plataforma de estudio con IA y economía de puntos. Roles: **admin**, **teacher**, **student**.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind v4 + shadcn/ui
- Supabase (Auth + Postgres + Storage + RLS)
- Google Gemini (Dev C)
- Vercel para deploy

## Setup local

```bash
git clone <repo>
cd hackaton
npm install
cp .env.example .env.local
# Completar SUPABASE_SERVICE_ROLE_KEY y GEMINI_API_KEY en .env.local
npm run dev
```

App en http://localhost:3000

## Cómo crear el primer admin

Demo: `/register` permite elegir rol al crear cuenta. En el primer registro elegí **admin** y listo. A partir de ahí, el panel admin gestiona el resto.

Si querés promover una cuenta existente a admin desde Supabase Studio:

```sql
update profiles set role = 'admin'
 where id = (select id from auth.users where email = 'tu@email.com');
```

## División del trabajo (branches)

| Dev | Branch | Responsabilidad |
|---|---|---|
| **A** | `feat/auth-admin` | Foundation: schema, RLS, auth, middleware, panel admin. **(este scaffold)** |
| **B** | `feat/teacher` | Panel teacher: subir PDFs a Storage, CRUD notas, asistencia. Vistas read-only del student |
| **C** | `feat/study-ai` | Gemini: extracción de texto del PDF, generación de quiz/flashcards/fill-blank/open. Pomodoro. Ledger de puntos. Dashboard student |

### Reglas para no pisarse

1. **Nadie toca `supabase/migrations/` salvo Dev A.** Si necesitan una columna, la piden en el chat.
2. Cada dev edita SOLO sus rutas:
   - Dev A → `app/(admin)/*`, `app/(auth)/*`, `lib/supabase/*`, `middleware.ts`, `supabase/migrations/*`
   - Dev B → `app/(teacher)/*`, `app/(student)/notas/*`, `app/(student)/asistencia/*`, `app/api/materials/*`, `components/teacher/*`
   - Dev C → `app/(student)/estudiar/*`, `app/(student)/dashboard/*` (sobreescribir `student/page.tsx`), `app/api/gemini/*`, `app/api/points/*`, `lib/gemini.ts`, `components/study/*`
3. `components/ui/` (shadcn) se agrega con `npx shadcn add <component>` — sin conflicto si son componentes distintos.
4. PRs chicos a `main` apenas algo funciona.

## Estructura

```
app/
├── (auth)/        login + register + actions    [Dev A — listo]
├── (admin)/       panel admin                   [Dev A — listo]
├── (teacher)/     panel teacher                 [Dev B — placeholder]
├── (student)/     panel student                 [Dev C — placeholder + balance puntos]
└── api/
    ├── gemini/    [Dev C]
    ├── materials/ [Dev B]
    └── points/    [Dev C]

lib/
├── supabase/      clients (browser + server + admin)  [Dev A]
├── database.types.ts  tipos generados desde DB
└── gemini.ts      [Dev C]

components/
├── ui/            shadcn
├── role-nav.tsx   sidebar compartida
├── admin/         [Dev A]
├── teacher/       [Dev B]
└── study/         [Dev C]

supabase/
└── migrations/    [solo Dev A]
```

## Schema (resumen)

- `profiles` (id↔auth.users, role, points_balance)
- `courses`, `subjects`, `enrollments`
- `grades`, `attendance`
- `materials` (PDF en Storage bucket `materials`, extracted_text)
- `study_sessions`, `questions`, `answers` (todo generado, no se reusa)
- `points_ledger` (trigger actualiza `profiles.points_balance`)

RLS aplicado a todas las tablas. Helper SQL `public.current_role()` para policies.

## Dar puntos (Dev C)

Insertar en `points_ledger` con el cliente de servicio:

```ts
import { createAdminClient } from "@/lib/supabase/server";
const admin = createAdminClient();
await admin.from("points_ledger").insert({
  student_id: userId,
  delta: 10,
  reason: "correct_answer",
  ref_id: answerId,
});
// El trigger actualiza profiles.points_balance automáticamente.
```

## Regenerar tipos TS

Cuando A toque el schema:

```bash
npx supabase gen types typescript --project-id mmcahdqmjwftuygjexsz > lib/database.types.ts
```

## Deploy a Vercel

1. Conectar el repo desde dashboard.vercel.com
2. Variables de entorno: copiar todo `.env.local` (las `NEXT_PUBLIC_*` se exponen al cliente; `SUPABASE_SERVICE_ROLE_KEY` y `GEMINI_API_KEY` quedan server-only).
3. Push a `main` = deploy.
