export default function TeacherHome() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Panel del profesor</h1>
      <p className="text-muted-foreground">
        Placeholder — Dev B implementa acá: subir materiales (PDF), cargar notas,
        pasar asistencia.
      </p>
      <ul className="list-disc pl-6 text-sm">
        <li>/teacher/materials → subir PDFs por materia</li>
        <li>/teacher/grades → cargar calificaciones</li>
        <li>/teacher/attendance → pasar asistencia</li>
      </ul>
    </div>
  );
}
