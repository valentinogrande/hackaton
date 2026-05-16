export default function StudyPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Estudiar</h1>
      <div className="rounded-md border p-6 bg-card text-sm space-y-2">
        <p className="font-medium">Placeholder — Dev FRONT (UI) + Dev BACK (Gemini)</p>
        <p className="text-muted-foreground">
          Elegir un material → llamar a <code>startStudySession</code> (
          <code>./actions.ts</code>) → renderizar la cola de preguntas y mandar
          respuestas con <code>answerQuestion</code>. Cada respuesta correcta
          suma puntos (Dev TOKENS define la fórmula en{" "}
          <code>@/lib/tokens/economy</code>).
        </p>
      </div>
    </div>
  );
}
