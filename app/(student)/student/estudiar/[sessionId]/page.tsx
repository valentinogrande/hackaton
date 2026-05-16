import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudyRunner, type ClientQuestion } from "./runner";

export default async function StudySessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session, error: sErr } = await supabase
    .from("study_sessions")
    .select("id, student_id, material_id, mode, materials(title)")
    .eq("id", sessionId)
    .single();
  if (sErr || !session) notFound();
  if (session.student_id !== user.id) redirect("/student/estudiar");

  const { data: rawQuestions } = await supabase
    .from("questions")
    .select("id, kind, prompt, created_at")
    .eq("session_id", sessionId)
    .order("created_at");

  // Strip `correct` before sending to client — server scores via answerQuestion.
  const questions: ClientQuestion[] = (rawQuestions ?? []).map((q) => ({
    id: q.id,
    kind: q.kind,
    prompt: q.prompt as Record<string, unknown>,
  }));

  if (questions.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">
          {session.materials?.title ?? "Sesión"}
        </h1>
        <p className="text-muted-foreground">No hay preguntas en esta sesión.</p>
      </div>
    );
  }

  return (
    <StudyRunner
      materialTitle={session.materials?.title ?? "Material"}
      questions={questions}
    />
  );
}
