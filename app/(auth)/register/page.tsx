import Link from "next/link";
import { RegisterForm } from "./register-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Crear cuenta</CardTitle>
          <CardDescription>
            Demo: el rol se elige en el registro. En producción esto lo gestiona el admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <p className="mt-4 text-sm text-muted-foreground text-center">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="underline">
              Ingresá
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
