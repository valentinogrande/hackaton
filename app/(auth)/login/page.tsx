import { LoginForm } from "./login-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Ingresar</CardTitle>
          <CardDescription>Entrá con tu cuenta de StudyPay.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <p className="mt-4 text-xs text-muted-foreground text-center">
            ¿No tenés cuenta? Pedile a un admin del colegio que te dé acceso.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
