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
  const score = period
    ? await getStudentScoreForPeriod(user.id, period.id)
    : null;
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
    Number(score?.payout_amount ?? 0) -
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
              Disponible para retirar: ${availableForWithdrawal.toFixed(2)}
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
