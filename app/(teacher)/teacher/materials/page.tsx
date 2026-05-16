import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UploadMaterialForm,
  ViewPdfButton,
  DeleteMaterialButton,
} from "./client";

export default async function MaterialsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, courses(name, year)")
    .eq("teacher_id", user.id)
    .order("name");

  const subjectIds = (subjects ?? []).map((s) => s.id);
  const { data: materials } = subjectIds.length
    ? await supabase
        .from("materials")
        .select("id, title, pdf_path, created_at, subject_id, subjects(name)")
        .in("subject_id", subjectIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Materiales</h1>

      {(subjects ?? []).length === 0 ? (
        <div className="rounded-md border p-4 bg-card text-sm text-muted-foreground">
          No tenés materias asignadas. Pedile a un admin que te asigne una desde{" "}
          <code>/admin/subjects</code>.
        </div>
      ) : (
        <UploadMaterialForm subjects={subjects ?? []} />
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Materia</TableHead>
              <TableHead>Subido</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(materials ?? []).length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  Todavía no subiste ningún material.
                </TableCell>
              </TableRow>
            ) : (
              (materials ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.title}</TableCell>
                  <TableCell>{m.subjects?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <ViewPdfButton path={m.pdf_path} />
                    <DeleteMaterialButton id={m.id} />
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
