import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentPeriodForSchool,
  getDemoSchoolId,
} from "@/lib/data/scores";
import { getTeacherPoolDetail } from "@/lib/data/pools";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, Wallet } from "lucide-react";

function rankBadge(rank: number | null) {
  if (rank === 1) return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/40">1º</Badge>;
  if (rank === 2) return <Badge className="bg-zinc-400/15 text-zinc-700 border-zinc-400/40">2º</Badge>;
  if (rank === 3) return <Badge className="bg-orange-500/15 text-orange-700 border-orange-500/40">3º</Badge>;
  return <Badge variant="outline">{rank ?? "—"}º</Badge>;
}

export default async function TeacherPoolPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const schoolId = await getDemoSchoolId();
  const period = schoolId ? await getCurrentPeriodForSchool(schoolId) : null;
  const detail = period ? await getTeacherPoolDetail(user.id, period.id) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Mi pool</h1>
        <p className="text-sm text-muted-foreground">
          Período {period?.period ?? "—"}. Tu pool se distribuye entre los
          cursos que enseñás, y dentro de cada curso los alumnos compiten por
          composite (notas + estudio).
        </p>
      </div>

      {!detail || !period ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin período activo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Pedile al admin que cree un período en{" "}
            <code>/admin/payouts</code> y lo recalcule.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Wallet className="size-4" />
                  Pool a repartir
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  ${detail.pool_amount.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Se reparte entre tus alumnos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tu bonus fijo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  ${detail.teacher_bonus.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Lo cobrás vos al cerrar el período
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total movilizado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  ${(detail.pool_amount + detail.teacher_bonus).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tu pool + bonus
                </p>
              </CardContent>
            </Card>
          </div>

          {detail.by_course.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Sin cursos asignados o sin alumnos enrollados. Pedile al admin
                que te asigne materias en <code>/admin/subjects</code>.
              </CardContent>
            </Card>
          ) : (
            detail.by_course.map((c) => (
              <div key={c.course_id} className="space-y-2">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Trophy className="size-4" />
                  {c.course_name} <span className="text-muted-foreground text-sm">({c.course_year})</span>
                </h2>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>Alumno</TableHead>
                        <TableHead>Promedio</TableHead>
                        <TableHead>Pts estudio</TableHead>
                        <TableHead>Composite</TableHead>
                        <TableHead className="text-right">Recibe</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {c.leaderboard.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Sin alumnos enrollados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        c.leaderboard.map((row) => (
                          <TableRow key={row.student_id}>
                            <TableCell>{rankBadge(row.rank)}</TableCell>
                            <TableCell className="font-medium">
                              {row.student_name}
                            </TableCell>
                            <TableCell>
                              {row.grade_avg > 0
                                ? row.grade_avg.toFixed(1)
                                : "—"}
                            </TableCell>
                            <TableCell>{row.study_points}</TableCell>
                            <TableCell>{row.composite.toFixed(3)}</TableCell>
                            <TableCell className="text-right font-semibold">
                              ${row.amount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
