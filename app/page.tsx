import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role) redirect(`/${profile.role}`);
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight">StudyPay</h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-md">
        La plataforma que te paga por estudiar. Subí PDFs, generá quizzes con IA
        y ganá puntos por cada respuesta correcta.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/login" className={buttonVariants()}>
          Ingresar
        </Link>
        <Link href="/register" className={buttonVariants({ variant: "outline" })}>
          Crear cuenta
        </Link>
      </div>
    </main>
  );
}
