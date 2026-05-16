import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { StudyButton } from "./study-button";

export default async function EstudiarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Materials from subjects the student is enrolled in (via course).
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", user.id);

  const courseIds = (enrollments ?? []).map((e) => e.course_id);

  const { data: subjects } = courseIds.length
    ? await supabase
        .from("subjects")
        .select("id, name, course_id")
        .in("course_id", courseIds)
    : { data: [] };

  const subjectIds = (subjects ?? []).map((s) => s.id);

  const { data: materials } = subjectIds.length
    ? await supabase
        .from("materials")
        .select("id, title, created_at, subject_id, subjects(name)")
        .in("subject_id", subjectIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Estudiar</h1>
        <p className="text-sm text-muted-foreground">
          Elegí un material y Gemini te genera un quiz nuevo cada vez. Cada
          respuesta correcta suma puntos.
        </p>
      </div>

      {(materials ?? []).length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No hay materiales todavía</CardTitle>
            <CardDescription>
              Pedile a tu profe que suba un PDF en{" "}
              <code>/teacher/materials</code> y volvé.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(materials ?? []).map((m) => (
            <Card key={m.id}>
              <CardHeader>
                <CardTitle className="text-lg">{m.title}</CardTitle>
                <CardDescription>
                  {m.subjects?.name ?? "—"} ·{" "}
                  {new Date(m.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StudyButton materialId={m.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="rounded-md border bg-card p-4 text-xs text-muted-foreground flex items-start gap-2">
        <Sparkles className="size-4 mt-0.5 shrink-0" />
        <p>
          La generación de preguntas tarda 5-15 segundos por material. Las
          preguntas son nuevas en cada sesión: si volvés a estudiar el mismo
          PDF, te salen otras.
        </p>
      </div>
    </div>
  );
}
