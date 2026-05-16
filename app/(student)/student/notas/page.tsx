import { createClient } from "@/lib/supabase/server";
import { listGradesForStudent } from "@/lib/data/grades";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function StudentGradesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const grades = user ? await listGradesForStudent(user.id) : [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Mis notas</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Materia</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Sin notas todavía.
                </TableCell>
              </TableRow>
            ) : (
              grades.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>{g.subjects?.name ?? "—"}</TableCell>
                  <TableCell>{g.period}</TableCell>
                  <TableCell>{g.value}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(g.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
