import { createClient } from "@/lib/supabase/server";
import { listWithdrawalsForStudent } from "@/lib/data/withdrawals";
import {
  getCurrentPeriodForSchool,
  getDemoSchoolId,
  getStudentLivePeriodStats,
  currentPeriodKey,
} from "@/lib/data/scores";
import { getStudentPayoutBreakdown } from "@/lib/data/pools";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";
import { WithdrawDialog } from "./withdraw-dialog";

const STATUS_LABEL: Record<string, string> = {
  requested: "Solicitado",
  processing: "En proceso",
  paid: "Pagado",
  rejected: "Rechazado",
};

export default async function WalletPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const schoolId = await getDemoSchoolId();
  const period = schoolId ? await getCurrentPeriodForSchool(schoolId) : null;
  const periodKey = period?.period ?? currentPeriodKey();
  const stats = await getStudentLivePeriodStats(user.id, periodKey, period?.id);
  const breakdown = period ? await getStudentPayoutBreakdown(user.id, period.id) : [];
  const withdrawals = await listWithdrawalsForStudent(user.id);

  // Sum the breakdown for the live payout. getStudentPayoutBreakdown returns the
  // student_payouts snapshot if it exists, otherwise the live preview from the
  // RPC — same shape both ways.
  const payout =
    breakdown.length > 0
      ? breakdown.reduce((sum, r) => sum + r.amount, 0)
      : stats.payoutAmount ?? 0;

  const availableForWithdrawal = Math.max(
    0,
    payout -
      withdrawals
        .filter((w) => w.status !== "rejected")
        .reduce((sum, w) => sum + Number(w.amount), 0),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-800">Mi billetera</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Retirá tus puntos al alias o CBU que prefieras.
        </p>
      </div>

      {/* Balance card */}
      <Card className="bg-gradient-to-br from-emerald-50 to-violet-50 ring-1 ring-emerald-100/60">
        <CardContent className="p-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-700">
              <Wallet className="size-4" />
              <span className="text-sm font-600">Disponible para retirar</span>
            </div>
            <p className="text-5xl font-800 text-emerald-700">
              ${availableForWithdrawal.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              Período {periodKey} · Score: {stats.composite.toFixed(2)}
              {" · "}
              {stats.studyPoints} pts
              {stats.gradeAvg > 0 ? ` · prom ${stats.gradeAvg.toFixed(1)}` : ""}
            </p>
            {!stats.hasRecompute && period && (
              <p className="text-[11px] text-amber-700/80">
                Cálculo en vivo. El monto final se fija cuando el admin cierra el período.
              </p>
            )}
            {!period && (
              <p className="text-[11px] text-amber-700/80">
                Sin período activo — pedile al admin que cree uno para que puedas cobrar.
              </p>
            )}
          </div>
          <WithdrawDialog available={availableForWithdrawal} />
        </CardContent>
      </Card>

      {/* Breakdown por curso */}
      {breakdown.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-700 text-muted-foreground uppercase tracking-wide">
            Desglose por curso
          </h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Curso · Profe</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Prom</TableHead>
                  <TableHead>Pts estudio</TableHead>
                  <TableHead className="text-right">Te toca</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.map((r) => (
                  <TableRow key={`${r.teacher_id}-${r.course_id}`}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{r.course_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {r.teacher_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.rank ?? "—"}º</Badge>
                    </TableCell>
                    <TableCell>
                      {r.grade_avg > 0 ? r.grade_avg.toFixed(1) : "—"}
                    </TableCell>
                    <TableCell>{r.study_points}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${r.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Historial chiquito */}
      <div className="space-y-2">
        <h2 className="text-sm font-700 text-muted-foreground uppercase tracking-wide">
          Historial
        </h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground text-sm py-6"
                  >
                    Todavía no retiraste nada.
                  </TableCell>
                </TableRow>
              ) : (
                withdrawals.slice(0, 10).map((w) => {
                  const dest = w.destination as
                    | { type?: string; value?: string }
                    | null;
                  return (
                    <TableRow key={w.id}>
                      <TableCell className="text-sm">
                        {new Date(w.requested_at).toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {dest?.value
                          ? `${dest.type === "cbu" ? "CBU" : "Alias"} · ${dest.value}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${Number(w.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {STATUS_LABEL[w.status] ?? w.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {withdrawals.length > 10 && (
          <p className="text-xs text-muted-foreground text-right">
            Mostrando los últimos 10 retiros de {withdrawals.length}.
          </p>
        )}
      </div>
    </div>
  );
}
