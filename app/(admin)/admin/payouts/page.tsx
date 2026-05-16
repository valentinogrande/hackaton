import { createClient } from "@/lib/supabase/server";
import { listPendingWithdrawals } from "@/lib/data/withdrawals";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PayoutsPage() {
  const supabase = await createClient();
  const { data: periods } = await supabase
    .from("payout_periods")
    .select("*, schools(name)")
    .order("created_at", { ascending: false });
  const pending = await listPendingWithdrawals();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pools y retiros</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Placeholder — Dev TOKENS / Dev FRONT
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>
            Form para crear un período (mes + monto del pool), usando{" "}
            <code>createPeriod</code>. Botón &ldquo;Recalcular scores&rdquo; →{" "}
            <code>recomputeScores(periodId)</code>.
          </p>
          <p>Botón por retiro para marcarlo como pagado → <code>markWithdrawalPaid</code>.</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Períodos</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Colegio</TableHead>
                <TableHead>Pool</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(periods ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.period}</TableCell>
                  <TableCell>{p.schools?.name ?? "—"}</TableCell>
                  <TableCell>${p.pool_amount}</TableCell>
                  <TableCell>{p.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Retiros pendientes</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alumno</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Solicitado</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nada pendiente.
                  </TableCell>
                </TableRow>
              ) : (
                pending.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>{w.profiles?.full_name ?? "—"}</TableCell>
                    <TableCell>${w.amount}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(w.requested_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{w.status}</TableCell>
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
