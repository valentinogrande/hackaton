import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Runner } from "./runner";
import type { SessionItem } from "@/lib/study-types";

function rowToItem(q: {
  id: string;
  kind: string;
  prompt: unknown;
  correct: unknown;
}): { item: SessionItem; questionId: string } | null {
  const prompt = (q.prompt ?? {}) as Record<string, unknown>;
  const correct = (q.correct ?? {}) as Record<string, unknown>;
  const hash = (prompt.hash as string | undefined) ?? q.id;

  switch (q.kind) {
    case "multiple_choice":
      return {
        questionId: q.id,
        item: {
          type: "quiz",
          question: prompt.question as string,
          options: prompt.options as string[],
          correctIndex: correct.correctIndex as number,
          explanation: (correct.explanation as string) ?? "",
          hash,
        },
      };
    case "flashcard":
      return {
        questionId: q.id,
        item: {
          type: "flashcard",
          front: prompt.front as string,
          back: prompt.back as string,
          hash,
        },
      };
    case "fill_blank":
      return {
        questionId: q.id,
        item: {
          type: "cloze",
          sentence: prompt.sentence as string,
          options: prompt.options as string[],
          correctIndex: correct.correctIndex as number,
          answer: (correct.answer as string) ?? "",
          hash,
        },
      };
    case "true_false":
      return {
        questionId: q.id,
        item: {
          type: "trueFalse",
          statement: prompt.statement as string,
          isTrue: correct.isTrue as boolean,
          explanation: (correct.explanation as string) ?? "",
          hash,
        },
      };
    default:
      return null;
  }
}

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
    .select("id, kind, prompt, correct, created_at")
    .eq("session_id", sessionId)
    .order("created_at");

  const mapped = (rawQuestions ?? [])
    .map((q) =>
      rowToItem({
        id: q.id,
        kind: q.kind,
        prompt: q.prompt,
        correct: q.correct,
      })
    )
    .filter(Boolean) as { item: SessionItem; questionId: string }[];

  if (mapped.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{session.materials?.title ?? "Sesión"}</h1>
        <p className="text-muted-foreground">No hay preguntas en esta sesión.</p>
      </div>
    );
  }

  const items = mapped.map((m) => m.item);
  const questionIds: Record<string, string> = {};
  for (const m of mapped) {
    questionIds[m.item.hash] = m.questionId;
  }

  return (
    <Runner
      sessionId={sessionId}
      materialTitle={session.materials?.title ?? "Material"}
      items={items}
      questionIds={questionIds}
    />
  );
}
