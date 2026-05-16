import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Sparkles,
  ListChecks,
  Layers,
  Pencil,
  CircleHelp,
} from "lucide-react";
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
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Estudiar</h1>
        <p className="text-sm text-muted-foreground">
          Elegí un material y un modo. Gemini te genera un set nuevo cada vez.
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(materials ?? []).map((m) => (
            <Card key={m.id}>
              <CardHeader>
                <CardTitle className="text-lg">{m.title}</CardTitle>
                <CardDescription>
                  {m.subjects?.name ?? "—"} ·{" "}
                  {new Date(m.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <StudyButton
                  materialId={m.id}
                  mode="quiz"
                  label="Quiz"
                />
                <StudyButton
                  materialId={m.id}
                  mode="flashcards"
                  label="Flashcards"
                  variant="outline"
                />
                <StudyButton
                  materialId={m.id}
                  mode="fill_blank"
                  label="Completar"
                  variant="outline"
                />
                <StudyButton
                  materialId={m.id}
                  mode="true_false"
                  label="V / F"
                  variant="outline"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <ModeHint
          icon={<ListChecks className="size-4" />}
          title="Quiz"
          desc="5 preguntas multiple choice con explicación. +5 pts por acierto."
        />
        <ModeHint
          icon={<Layers className="size-4" />}
          title="Flashcards"
          desc="Mirás el frente, intentás recordar el dorso, marcás si lo sabías. +3 pts."
        />
        <ModeHint
          icon={<Pencil className="size-4" />}
          title="Completar huecos"
          desc="Oración con un hueco, elegís la palabra correcta entre 4. +7 pts."
        />
        <ModeHint
          icon={<CircleHelp className="size-4" />}
          title="Verdadero / Falso"
          desc="Afirmación + 2 botones, después la explicación. +4 pts."
        />
      </div>

      <div className="rounded-md border bg-card p-3 text-xs text-muted-foreground flex items-start gap-2">
        <Sparkles className="size-4 mt-0.5 shrink-0" />
        <p>
          La generación tarda 5-15 segundos. Las preguntas son nuevas en cada
          sesión.
        </p>
      </div>
    </div>
  );
}

function ModeHint({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-md border bg-card p-3 flex items-start gap-2">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
