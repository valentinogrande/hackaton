export default function TeacherAttendancePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Asistencia</h1>
      <div className="rounded-md border p-6 bg-card text-sm">
        <p className="font-medium mb-2">Placeholder — Dev FRONT</p>
        <p className="text-muted-foreground">
          Elegir materia + fecha → marcar present/absent/late por alumno.
          Importa <code>markAttendance</code> de <code>./actions.ts</code>.
        </p>
      </div>
    </div>
  );
}
