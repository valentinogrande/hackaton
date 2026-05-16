import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sparkles } from "lucide-react";
import { StudyButton } from "./study-button";

export default async function EstudiarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-800">Estudiar</h1>
        <p className="text-sm text-muted-foreground">
          Elegí un material. Gemini genera una sesión mixta con quiz, flashcards, completar y V/F.
        </p>
      </div>

      {(materials ?? []).length === 0 ? (
        <div className="bg-violet-50 ring-1 ring-violet-100 rounded-2xl p-8 text-center space-y-2">
          <p className="text-base font-700 text-foreground">No hay materiales todavía</p>
          <p className="text-sm text-muted-foreground">
            Pedile a tu profe que suba un PDF en{" "}
            <code className="bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-md text-xs">
              /teacher/materials
            </code>{" "}
            y volvé.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(materials ?? []).map((m) => (
            <div
              key={m.id}
              className="bg-card ring-1 ring-border rounded-2xl p-5 flex items-center justify-between gap-4 transition-all duration-200 hover:shadow-md hover:ring-violet-200"
            >
              <div className="border-l-4 border-violet-400 pl-3 min-w-0">
                <p className="font-700 text-base text-foreground truncate">{m.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {m.subjects?.name ?? "—"} · {new Date(m.created_at).toLocaleDateString("es-AR")}
                </p>
              </div>
              <StudyButton materialId={m.id} />
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl bg-violet-50 ring-1 ring-violet-100 p-4 text-sm text-muted-foreground flex items-start gap-2.5">
        <Sparkles className="size-4 mt-0.5 shrink-0 text-violet-500" />
        <p>
          La generación tarda 10–20 segundos. Cada sesión mezcla los 4 tipos de preguntas y las
          preguntas fallidas se repiten hasta dominarlas.
        </p>
      </div>
    </div>
  );
}
