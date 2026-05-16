import Link from "next/link";
import { GraduationCap, BookOpen, Award } from "lucide-react";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <main className="flex-1 flex min-h-screen">
      {/* Panel izquierdo — brand */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, oklch(0.42 0.24 277) 0%, oklch(0.25 0.18 277) 100%)" }}>
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-white/20 flex items-center justify-center">
              <GraduationCap className="size-5 text-white" />
            </div>
            <span className="text-xl font-800 text-white tracking-tight">StudyPay</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-800 text-white leading-tight">
              Empezá hoy.<br />Aprendé mejor.<br />Ganás más.
            </h1>
            <p className="text-white/60 text-lg font-400 leading-relaxed">
              Unite a la comunidad que transforma el estudio en recompensas reales.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
              <BookOpen className="size-5 text-violet-200 shrink-0" />
              <p className="text-white/80 text-sm">Materiales cargados por tus profesores</p>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
              <Award className="size-5 text-violet-200 shrink-0" />
              <p className="text-white/80 text-sm">Puntos que se convierten en dinero real</p>
            </div>
          </div>
        </div>

        <div className="absolute -top-20 -right-20 size-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 size-48 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* Panel derecho — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-8 animate-fade-slide-up">
          <div className="space-y-1">
            <h2 className="text-2xl font-700 text-foreground">Crear cuenta</h2>
            <p className="text-muted-foreground text-sm">
              Demo: el rol se elige en el registro.
            </p>
          </div>

          <RegisterForm />

          <p className="text-sm text-muted-foreground text-center">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-primary font-600 hover:underline">
              Ingresá
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
