export default function MaterialsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Materiales</h1>
      <div className="rounded-md border p-6 bg-card text-sm">
        <p className="font-medium mb-2">Placeholder — Dev FRONT</p>
        <p className="text-muted-foreground">
          Form para subir PDFs a una materia + tabla de materiales existentes.
          Importa <code>uploadMaterial</code> y <code>deleteMaterial</code> de{" "}
          <code>./actions.ts</code> (stubs ya armados por Dev BACK).
        </p>
      </div>
    </div>
  );
}
