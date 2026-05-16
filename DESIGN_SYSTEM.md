# StudyPay — Design System

Sistema de diseño de referencia para todo el equipo. Antes de agregar estilos nuevos, consultá acá.

---

## Identidad visual

**Concepto:** Premium educativo. Violeta profundo + blanco limpio. Smooth, escolar, confiable.
**Referencia:** Estilo Quyl dashboard — sidebar coloreada, cards con pastel tints, micro-interacciones.

---

## Colores

### Paleta principal (OKLCH)

| Token | Valor OKLCH | Uso |
|---|---|---|
| `--primary` | `oklch(0.511 0.262 276.966)` | Botones, links activos, acentos principales |
| `--primary-foreground` | `oklch(1 0 0)` | Texto sobre primary |
| `--secondary` | `oklch(0.943 0.055 277)` | Chips, badges, fondos suaves |
| `--accent` | `oklch(0.943 0.055 277)` | Hover states suaves |
| `--background` | `oklch(0.985 0.004 277)` | Fondo de la app (blanco con tinte violeta sutil) |
| `--card` | `oklch(1 0 0)` | Cards, modales |
| `--muted` | `oklch(0.97 0.008 277)` | Fondos de sección secundaria |
| `--muted-foreground` | `oklch(0.556 0.015 277)` | Texto secundario/descriptivo |
| `--border` | `oklch(0.92 0.012 277)` | Bordes de cards, inputs |
| `--ring` | `oklch(0.511 0.262 277)` | Focus rings |

### Sidebar

| Token | Valor | Uso |
|---|---|---|
| `--sidebar` | `oklch(0.32 0.20 277)` | Fondo sidebar (violeta profundo) |
| `--sidebar-foreground` | `oklch(1 0 0)` | Texto blanco |
| `--sidebar-primary` | `oklch(1 0 0 / 15%)` | Fondo item activo |
| `--sidebar-accent` | `oklch(1 0 0 / 8%)` | Fondo hover |
| `--sidebar-border` | `oklch(1 0 0 / 10%)` | Separadores internos |

### Stat cards (colores semánticos)

Cada sección de la app tiene un color propio. Usarlos consistentemente:

| Sección | BG | Icon BG | Icon color | Ring |
|---|---|---|---|---|
| Admin / Usuarios / Principal | `bg-violet-50` | `bg-violet-100` | `text-violet-600` | `ring-violet-100` |
| Cursos / Materiales | `bg-blue-50` | `bg-blue-100` | `text-blue-600` | `ring-blue-100` |
| Notas / Materias | `bg-emerald-50` | `bg-emerald-100` | `text-emerald-600` | `ring-emerald-100` |
| Billetera / Pagos | `bg-amber-50` | `bg-amber-100` | `text-amber-600` | `ring-amber-100` |
| Errores / Destructive | `bg-rose-50` | `bg-rose-100` | `text-rose-600` | `ring-rose-100` |

### Chart colors

`--chart-1` violet · `--chart-2` indigo · `--chart-3` emerald · `--chart-4` amber · `--chart-5` rose

---

## Tipografía

**Fuente:** Nunito (Google Fonts) — weights 400–800

| Uso | Clase Tailwind | Peso | Tamaño |
|---|---|---|---|
| Page title | `text-3xl font-extrabold` | 800 | 1.875rem |
| Section title | `text-xl font-bold` | 700 | 1.25rem |
| Card title | `text-base font-bold` | 700 | 1rem |
| Body | `text-sm font-normal` | 400 | 0.875rem |
| Caption / label | `text-xs font-medium` | 500 | 0.75rem |
| Gradient heading | `bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent` | — | — |

---

## Border radius

Sistema basado en `--radius: 0.75rem`:

| Clase | Valor | Cuándo usar |
|---|---|---|
| `rounded-xl` | 12px | Cards pequeñas, inputs, badges |
| `rounded-2xl` | 16px | Cards medianas, botones grandes |
| `rounded-3xl` | ~18px | Cards destacadas, hero sections |
| `rounded-full` | 9999px | Avatares, chips de estado |

---

## Espaciado

Usar siempre el sistema de 4px:

- `gap-1` (4px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px), `gap-5` (20px), `gap-6` (24px), `gap-8` (32px)
- Padding de página: `p-6`
- Padding de card: `p-4` o `p-5`
- Spacing entre secciones: `space-y-8`

---

## Componentes

### Card coloreada (stat card)

```tsx
<div className="bg-violet-50 ring-1 ring-violet-100 rounded-2xl p-5 flex flex-col gap-4
  transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
  <div className="flex items-center justify-between">
    <p className="text-sm font-semibold text-foreground/70">Label</p>
    <div className="size-8 rounded-xl bg-white ring-1 ring-violet-100 flex items-center justify-center">
      <Icon className="size-4 text-violet-600" />
    </div>
  </div>
  <p className="text-4xl font-extrabold text-violet-600">42</p>
</div>
```

### Quick-action card (con link)

```tsx
<Link href="/ruta" className="bg-violet-50 ring-1 ring-violet-100 rounded-2xl p-4 flex flex-col gap-3
  transition-all duration-200 hover:scale-[1.02] hover:shadow-md group">
  <div className="flex items-center justify-between">
    <div className="size-9 rounded-xl bg-violet-100 flex items-center justify-center">
      <Icon className="size-5 text-violet-600" />
    </div>
    <ArrowRight className="size-4 text-foreground/30 group-hover:text-foreground/60 transition-colors" />
  </div>
  <div>
    <p className="text-sm font-bold text-foreground">Label</p>
    <p className="text-xs text-muted-foreground mt-0.5">Descripción corta</p>
  </div>
</Link>
```

### Card de contenido (material, item de lista)

```tsx
<div className="bg-card ring-1 ring-border rounded-2xl p-5 space-y-4
  transition-all duration-200 hover:shadow-md hover:ring-violet-200">
  <div className="border-l-4 border-violet-400 pl-3">
    <p className="font-bold text-base text-foreground">Título</p>
    <p className="text-xs text-muted-foreground mt-0.5">Subtítulo o metadata</p>
  </div>
  {/* contenido */}
</div>
```

### Nav item (sidebar)

```tsx
<Link className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
  transition-colors duration-150
  {active ? 'bg-white/15 text-white font-semibold' : 'text-white/70 hover:bg-white/8 hover:text-white'}">
  <Icon className="size-4 shrink-0" />
  Label
</Link>
```

---

## Animaciones

| Animación | Clases | Cuándo usar |
|---|---|---|
| Page entry | `animate-in fade-in-0 slide-in-from-bottom-4 duration-300` | Wrapper de contenido en layouts |
| Card hover | `transition-all duration-200 hover:scale-[1.02] hover:shadow-md` | Todas las cards clicables |
| Nav hover | `transition-colors duration-150` | Items de navegación |
| Count-up | `<AnimatedNumber value={n} />` | Números estadísticos al cargar |
| Fade slide | `.animate-fade-slide-up` (keyframe en globals.css) | Formularios, paneles |
| Modal | ya incluido en shadcn Dialog | — |
| Select/Dropdown | ya incluido en shadcn | — |

---

## Iconos

Librería: **lucide-react** (ya instalada).

| Sección | Ícono |
|---|---|
| Home / Inicio | `Home` |
| Usuarios | `Users` |
| Cursos | `BookOpen` |
| Materias | `Layers` |
| Payouts | `Landmark` |
| Materiales (PDF) | `FileText` |
| Notas | `ClipboardList` |
| Asistencia | `CalendarCheck` / `CalendarDays` |
| Estudiar | `Brain` |
| Billetera | `Wallet` |
| Salir | `LogOut` |
| IA / Gemini | `Sparkles` |
| Logo app | `GraduationCap` |

Tamaño estándar: `size-4` (inline) · `size-5` (cards) · `size-8` (hero/display)

---

## Layout

```
<html> (h-full antialiased, font Nunito)
  <body> (min-h-full flex flex-col bg-background)
    <RoleLayout>
      <aside w-60 bg-sidebar>   ← RoleNav
      <main flex-1 p-6 overflow-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-300>
        {children}
      </main>
    </RoleLayout>
```

---

## Reglas generales

1. **No usar colores hardcodeados** — siempre usar los tokens CSS o las clases Tailwind semánticas (`bg-primary`, `text-muted-foreground`, etc.) o el color de sección correspondiente.
2. **Cards clicables siempre con hover** — `transition-all duration-200 hover:scale-[1.02] hover:shadow-md`.
3. **Títulos de página** — `text-3xl font-extrabold`, opcionalmente con gradient en el nombre propio.
4. **Números estadísticos** — usar `<AnimatedNumber>` para count-up al montar.
5. **Sidebar** — no modificar los tokens `--sidebar-*`, pertenecen a `feat/front`.
6. **No dark mode** — solo light mode. Ignorar las clases `.dark:`.
7. **Tipografía numérica** — `font-extrabold text-4xl` con el color del acento de la sección.
