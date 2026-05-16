import { createClient } from "@/lib/supabase/server";
import { listAttendanceForStudent } from "@/lib/data/attendance";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const LABEL: Record<string, string> = {
  present: "Presente",
  absent: "Ausente",
  late: "Tarde",
};

export default async function StudentAttendancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const rows = user ? await listAttendanceForStudent(user.id) : [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Asistencia</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Materia</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Sin registros.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.subjects?.name ?? "—"}</TableCell>
                  <TableCell>{LABEL[r.status] ?? r.status}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
