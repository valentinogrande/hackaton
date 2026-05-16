import { createClient } from "@/lib/supabase/server";
import { listWithdrawalsForStudent } from "@/lib/data/withdrawals";
import {
  getCurrentPeriodForSchool,
  getDemoSchoolId,
  getStudentLivePeriodStats,
  currentPeriodKey,
} from "@/lib/data/scores";
import { getStudentPayoutBreakdown } from "@/lib/data/pools";
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
import { Trophy, GraduationCap, Info } from "lucide-react";
import { BankInfoForm } from "./bank-form";
import { WithdrawForm } from "./withdraw-form";

const STATUS_LABEL: Record<string, string> = {
  requested: "Solicitado",
  processing: "En proceso",
  paid: "Pagado",
  rejected: "Rechazado",
};

function rankBadge(rank: number | null) {
  if (rank === 1) return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/40">1º</Badge>;
  if (rank === 2) return <Badge className="bg-zinc-400/15 text-zinc-700 border-zinc-400/40">2º</Badge>;
  if (rank === 3) return <Badge className="bg-orange-500/15 text-orange-700 border-orange-500/40">3º</Badge>;
  return <Badge variant="outline">{rank ?? "—"}º</Badge>;
}

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
  const breakdown = period
    ? await getStudentPayoutBreakdown(user.id, period.id)
    : [];
  const withdrawals = await listWithdrawalsForStudent(user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("bank_cbu, bank_alias")
    .eq("id", user.id)
    .single();

  const availableForWithdrawal = Math.max(
    0,
    (stats.payoutAmount ?? 0) -
      withdrawals
        .filter((w) => w.status !== "rejected")
        .reduce((sum, w) => sum + Number(w.amount), 0)
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mi billetera</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Período actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{periodKey}</p>
            <p className="text-xs text-muted-foreground">
              {period
                ? `Pool del colegio: $${period.pool_amount}`
                : "Sin período activo. Pedile al admin que cree uno."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tu desempeño del mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.composite.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              {stats.studyPoints} pts ·{" "}
              {stats.gradeAvg > 0 ? `prom ${stats.gradeAvg.toFixed(1)}` : "sin notas"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estimación a cobrar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.hasRecompute ? (
              <>
                <p className="text-3xl font-bold">
                  ${stats.payoutAmount?.toFixed(2) ?? "0.00"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Disponible para retirar: ${availableForWithdrawal.toFixed(2)}
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-muted-foreground">—</p>
                <p className="text-xs text-muted-foreground">
                  Se calcula cuando el admin cierre el período
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {!stats.hasRecompute && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
          <Info className="size-4 mt-0.5 shrink-0" />
          <p>
            Los números de arriba son <strong>en vivo</strong>: cuentan tus notas y
            puntos del mes. El payout se fija cuando el admin corre &ldquo;Recalcular&rdquo; en{" "}
            <code className="bg-amber-100 px-1.5 py-0.5 rounded-md text-xs">/admin/payouts</code>.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="size-4" />
          Tu desempeño por curso
        </h2>
        <p className="text-xs text-muted-foreground">
          Cada profe distribuye su pool entre sus cursos. Dentro de cada curso,
          los alumnos compiten: notas y estudio suman al composite, y los
          tokens se reparten cuadrático (top recibe más).
        </p>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso · Profe</TableHead>
                <TableHead>Posición</TableHead>
                <TableHead>Promedio</TableHead>
                <TableHead>Pts. estudio</TableHead>
                <TableHead className="text-right">Te toca</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breakdown.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    {period
                      ? "Pedile al admin que recalcule el período para ver el desglose."
                      : "Sin período activo."}
                  </TableCell>
                </TableRow>
              ) : (
                breakdown.map((r) => (
                  <TableRow key={`${r.teacher_id}-${r.course_id}`}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{r.course_name}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <GraduationCap className="size-3" />
                          {r.teacher_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{rankBadge(r.rank)}</TableCell>
                    <TableCell>
                      {r.grade_avg > 0 ? r.grade_avg.toFixed(1) : "—"}
                    </TableCell>
                    <TableCell>{r.study_points}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${r.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <BankInfoForm
        initialCbu={profile?.bank_cbu ?? ""}
        initialAlias={profile?.bank_alias ?? ""}
      />

      <WithdrawForm
        hasCbu={Boolean(profile?.bank_cbu)}
        hasAlias={Boolean(profile?.bank_alias)}
        available={availableForWithdrawal}
      />

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Mis retiros</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Sin retiros.
                  </TableCell>
                </TableRow>
              ) : (
                withdrawals.map((w) => {
                  const dest = w.destination as { type?: string; value?: string } | null;
                  return (
                    <TableRow key={w.id}>
                      <TableCell className="text-sm">
                        {new Date(w.requested_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>${w.amount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {dest?.type === "cbu" ? "CBU" : dest?.type === "alias" ? "Alias" : "—"}
                        {dest?.value ? ` · ${dest.value}` : ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{STATUS_LABEL[w.status]}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
