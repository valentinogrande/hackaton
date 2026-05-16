import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminHome() {
  const supabase = await createClient();

  const [{ count: users }, { count: courses }, { count: subjects }, { count: materials }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("courses").select("*", { count: "exact", head: true }),
      supabase.from("subjects").select("*", { count: "exact", head: true }),
      supabase.from("materials").select("*", { count: "exact", head: true }),
    ]);

  const stats = [
    { label: "Usuarios", value: users ?? 0 },
    { label: "Cursos", value: courses ?? 0 },
    { label: "Materias", value: subjects ?? 0 },
    { label: "Materiales", value: materials ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Panel de administración</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
