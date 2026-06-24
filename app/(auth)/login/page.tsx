import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <AuthCard
      eyebrow="Acceso privado"
      title="Ingresa a Margenia"
      subtitle="Accede al espacio donde construiremos el centro de control de tu negocio."
    >
      <LoginForm />
    </AuthCard>
  );
}
