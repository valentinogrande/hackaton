export default function TeacherGradesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Notas</h1>
      <div className="rounded-md border p-6 bg-card text-sm">
        <p className="font-medium mb-2">Placeholder — Dev FRONT</p>
        <p className="text-muted-foreground">
          Elegir una materia → cargar nota por alumno. Importa{" "}
          <code>createGrade</code> de <code>./actions.ts</code> y consume{" "}
          <code>listGradesForSubject</code> de <code>@/lib/data/grades</code>.
        </p>
      </div>
    </div>
  );
}
