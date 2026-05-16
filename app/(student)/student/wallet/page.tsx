import { createClient } from "@/lib/supabase/server";
import { listWithdrawalsForStudent } from "@/lib/data/withdrawals";
import {
  getCurrentPeriodForSchool,
  getDemoSchoolId,
  getStudentScoreForPeriod,
} from "@/lib/data/scores";
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
  const score = period
    ? await getStudentScoreForPeriod(user.id, period.id)
    : null;
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
              Pool total: ${period?.pool_amount ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tu score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{score?.composite ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {score?.study_points ?? 0} pts · prom {score?.grade_score ?? 0}
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
              Se calcula al cerrar el período
            </p>
          </CardContent>
        </Card>
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
