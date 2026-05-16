import { createClient } from "@/lib/supabase/server";
import { listPendingWithdrawals } from "@/lib/data/withdrawals";
import { listAllTeacherPools } from "@/lib/data/pools";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { userDisplayName } from "@/lib/utils/user";
import { PeriodForm, RecomputeButton, PayWithdrawalButton } from "./client";

export default async function PayoutsPage() {
  const supabase = await createClient();
  const { data: schools } = await supabase.from("schools").select("id, name");
  const { data: periods } = await supabase
    .from("payout_periods")
    .select("*, schools(name)")
    .order("created_at", { ascending: false });
  const pending = await listPendingWithdrawals();

  // Latest period: show its teacher pools.
  const latestPeriod = (periods ?? [])[0];
  const teacherPools = latestPeriod
    ? await listAllTeacherPools(latestPeriod.id)
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pools y retiros</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Crear período mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <PeriodForm schools={schools ?? []} />
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
                <TableHead>% profes</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-44"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(periods ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.period}</TableCell>
                  <TableCell>{p.schools?.name ?? "—"}</TableCell>
                  <TableCell>${p.pool_amount}</TableCell>
                  <TableCell>{Math.round(p.teacher_share * 100)}%</TableCell>
                  <TableCell>{p.status}</TableCell>
                  <TableCell>
                    <RecomputeButton periodId={p.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {latestPeriod && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">
            Pools por profesor · {latestPeriod.period}
          </h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profesor</TableHead>
                  <TableHead>Pool a repartir</TableHead>
                  <TableHead>Bonus fijo</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teacherPools.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground"
                    >
                      Apretá &ldquo;Recalcular&rdquo; arriba para distribuir el pool.
                    </TableCell>
                  </TableRow>
                ) : (
                  teacherPools.map((t) => (
                    <TableRow key={t.teacher_id}>
                      <TableCell>{t.teacher_name}</TableCell>
                      <TableCell>${t.pool_amount.toFixed(2)}</TableCell>
                      <TableCell>${t.teacher_bonus.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${(t.pool_amount + t.teacher_bonus).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

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
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nada pendiente.
                  </TableCell>
                </TableRow>
              ) : (
                pending.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>
                      {userDisplayName({
                        full_name: w.profiles?.full_name,
                        email: w.profiles?.email,
                        id: w.student_id,
                      })}
                    </TableCell>
                    <TableCell>${w.amount}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(w.requested_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{w.status}</TableCell>
                    <TableCell>
                      <PayWithdrawalButton id={w.id} />
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
