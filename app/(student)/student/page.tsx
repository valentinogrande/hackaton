import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function StudentHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("points_balance, full_name")
    .eq("id", user!.id)
    .single();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        Hola, {profile?.full_name?.split(" ")[0] || "estudiante"}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tus puntos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-5xl font-bold">{profile?.points_balance ?? 0}</p>
        </CardContent>
      </Card>

      <div className="rounded-md border p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Placeholder — Dev C implementa acá la sesión de estudio (Gemini + quiz + puntos).
        </p>
        <Link href="/student/estudiar" className={buttonVariants()}>
          Empezar a estudiar
        </Link>
      </div>
    </div>
  );
}
