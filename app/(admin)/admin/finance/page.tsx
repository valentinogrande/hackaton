import {
  getFinanceOverview,
  getSchoolsFinance,
} from "@/lib/data/finance/admin-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Banknote, TrendingUp, AlertTriangle, Wallet } from "lucide-react";
import { LivePoolRefresher } from "./client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatUsd(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
function formatArs(n: number) {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

export default async function AdminFinancePage() {
  let overview;
  let schools;
  let dbError: string | null = null;
  try {
    [overview, schools] = await Promise.all([
      getFinanceOverview(),
      getSchoolsFinance(),
    ]);
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  if (dbError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-800">Finanzas</h1>
        <Card className="border-amber-300/60 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base text-amber-900">
              Faltan migraciones financieras
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-900/80 space-y-2">
            <p>
              No se pueden leer las tablas del módulo financiero. Aplicá las
              migraciones <code>0007</code>, <code>0008</code> y <code>0009</code>{" "}
              en Supabase y regenerá los tipos.
            </p>
            <pre className="text-xs bg-white/60 rounded p-2 overflow-x-auto">
              {dbError}
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cycle = overview!.current_cycle;
  const netYieldUsd = Number(cycle?.net_yield_usd ?? 0);
  const studentTotalUsd = netYieldUsd * Number(cycle?.student_share ?? 0.6);
  const investorTotalUsd = netYieldUsd * Number(cycle?.investor_share ?? 0.3);
  const operationTotalUsd = netYieldUsd * Number(cycle?.operation_share ?? 0.1);

  const totalPoolArs = (schools ?? []).reduce(
    (acc, s) => acc + s.pool_amount_ars,
    0,
  );

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-800">Finanzas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Capital del fondo, yield del ciclo y distribución por colegio.
          </p>
        </div>
        <LivePoolRefresher />
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="AUM total"
          value={`USD ${formatUsd(overview!.total_aum_usd)}`}
          icon={Banknote}
          tint="emerald"
          hint={`${overview!.schools_count} colegios`}
        />
        <KpiCard
          label="Yield del mes"
          value={`USD ${formatUsd(netYieldUsd)}`}
          icon={TrendingUp}
          tint="violet"
          hint={cycle?.period ? `Ciclo ${cycle.period}` : "Sin ciclo activo"}
        />
        <KpiCard
          label="Pool total activo"
          value={`$${formatArs(totalPoolArs)}`}
          icon={Wallet}
          tint="blue"
          hint="Suma de pools abiertos"
        />
        <KpiCard
          label="Compliance abierto"
          value={String(overview!.open_flags)}
          icon={AlertTriangle}
          tint={overview!.open_flags > 0 ? "amber" : "zinc"}
          hint={`${overview!.pending_withdrawals} retiros pendientes`}
        />
      </div>

      {/* Cycle distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Distribución del ciclo {cycle?.period ?? "—"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cycle ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DistributionRow
                label="Alumnos"
                pct={Number(cycle.student_share)}
                usd={studentTotalUsd}
                color="bg-emerald-500"
              />
              <DistributionRow
                label="Inversores"
                pct={Number(cycle.investor_share)}
                usd={investorTotalUsd}
                color="bg-violet-500"
              />
              <DistributionRow
                label="Operación"
                pct={Number(cycle.operation_share)}
                usd={operationTotalUsd}
                color="bg-zinc-500"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Todavía no hay ciclo de yield calculado. Corré el cierre mensual
              desde <code>POST /api/finance/cycles/run</code>.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Schools table */}
      <div className="space-y-2">
        <h2 className="text-lg font-700">Colegios</h2>
        <p className="text-xs text-muted-foreground">
          Pool del período activo, alumnos activos y score promedio. Se
          actualiza cada 15 segundos.
        </p>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colegio</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Pool activo (ARS)</TableHead>
                <TableHead className="text-right">Rollover</TableHead>
                <TableHead className="text-right">Alumnos</TableHead>
                <TableHead className="text-right">Score prom.</TableHead>
                <TableHead className="text-right">Distribuido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(schools ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    Sin colegios cargados.
                  </TableCell>
                </TableRow>
              ) : (
                (schools ?? []).map((s) => (
                  <TableRow key={s.school_id}>
                    <TableCell className="font-medium">{s.school_name}</TableCell>
                    <TableCell>
                      {s.active_period ? (
                        <Badge variant="outline">{s.active_period}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${formatArs(s.pool_amount_ars)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {s.rollover_ars > 0 ? `$${formatArs(s.rollover_ars)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.active_students}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.avg_composite > 0 ? s.avg_composite.toFixed(2) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      ${formatArs(s.total_distributed_ars)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

type IconType = React.ComponentType<{ className?: string }>;

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IconType;
  tint: "emerald" | "violet" | "blue" | "amber" | "zinc";
}) {
  const styles: Record<string, { bg: string; iconColor: string; ring: string }> = {
    emerald: {
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      ring: "ring-emerald-100",
    },
    violet: {
      bg: "bg-violet-50",
      iconColor: "text-violet-600",
      ring: "ring-violet-100",
    },
    blue: { bg: "bg-blue-50", iconColor: "text-blue-600", ring: "ring-blue-100" },
    amber: {
      bg: "bg-amber-50",
      iconColor: "text-amber-600",
      ring: "ring-amber-100",
    },
    zinc: { bg: "bg-zinc-50", iconColor: "text-zinc-600", ring: "ring-zinc-200" },
  };
  const s = styles[tint];
  return (
    <div className={`${s.bg} ${s.ring} ring-1 rounded-2xl p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-600 text-foreground/70">{label}</p>
        <div
          className={`size-8 rounded-xl bg-white flex items-center justify-center ${s.ring} ring-1`}
        >
          <Icon className={`size-4 ${s.iconColor}`} />
        </div>
      </div>
      <p className={`text-2xl font-800 ${s.iconColor}`}>{value}</p>
      {hint && <p className="text-xs text-foreground/50">{hint}</p>}
    </div>
  );
}

function DistributionRow({
  label,
  pct,
  usd,
  color,
}: {
  label: string;
  pct: number;
  usd: number;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-600">{label}</span>
        <span className="text-xs text-muted-foreground">
          {(pct * 100).toFixed(0)}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${color}`}
          style={{ width: `${Math.min(pct * 100, 100)}%` }}
        />
      </div>
      <p className="text-lg font-700">USD {formatUsd(usd)}</p>
    </div>
  );
}
