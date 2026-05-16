import { createClient } from "@/lib/supabase/server";
import { listWithdrawalsForStudent } from "@/lib/data/withdrawals";
import {
  getCurrentPeriodForSchool,
  getDemoSchoolId,
  getStudentScoreForPeriod,
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
import { Trophy, GraduationCap } from "lucide-react";

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
  const score = period
    ? await getStudentScoreForPeriod(user.id, period.id)
    : null;
  const breakdown = period
    ? await getStudentPayoutBreakdown(user.id, period.id)
    : [];
  const withdrawals = await listWithdrawalsForStudent(user.id);

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
            <p className="text-2xl font-bold">{period?.period ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              Pool del colegio: ${period?.pool_amount ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tu score global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {score ? Number(score.composite).toFixed(2) : "0"}
            </p>
            <p className="text-xs text-muted-foreground">
              {score?.study_points ?? 0} pts · prom {score?.grade_score?.toFixed?.(1) ?? "—"}
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
            <p className="text-3xl font-bold">${score?.payout_amount ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              Se actualiza cuando se recalcula el período
            </p>
          </CardContent>
        </Card>
      </div>

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
                    Todavía no hay payouts calculados para este período.
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

      <div className="rounded-md border p-6 bg-card text-sm">
        <p className="font-medium mb-2">Placeholder — Dev FRONT</p>
        <p className="text-muted-foreground">
          Form de retiro (monto + CBU/alias) usando{" "}
          <code>requestWithdrawal</code> de <code>./actions.ts</code>.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Mis retiros</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Sin retiros.
                  </TableCell>
                </TableRow>
              ) : (
                withdrawals.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="text-sm">
                      {new Date(w.requested_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>${w.amount}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{STATUS_LABEL[w.status]}</Badge>
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
