import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { createClient } from "@/lib/supabase/server";

export default async function RegisterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <AuthCard
      eyebrow="Crea tu cuenta"
      title="Empieza con Margenia"
      subtitle="Regístrate para crear tu primer negocio y ver la base privada de la app."
    >
      <RegisterForm />
    </AuthCard>
  );
}
