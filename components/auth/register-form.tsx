"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "mt-2 w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-base text-[#0F172A] shadow-sm outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#BFDBFE]/60";

function getRegisterErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "Este correo ya está registrado. Intenta iniciar sesión.";
  }

  if (normalized.includes("password")) {
    return "La contraseña no cumple los requisitos. Usa al menos 8 caracteres.";
  }

  if (normalized.includes("email")) {
    return "Revisa que el correo esté escrito correctamente.";
  }

  return "No pudimos crear tu cuenta. Revisa los datos e intenta de nuevo.";
}

export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      setError("Completa todos los campos.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/app/onboarding`,
          data: {
            full_name: cleanName,
          },
        },
      });

      if (authError) {
        setError(getRegisterErrorMessage(authError.message));
        return;
      }

      if (!data.session) {
        setSuccess(
          "Cuenta creada. Revisa tu correo para confirmar el registro antes de iniciar sesión.",
        );
        setPassword("");
        setConfirmPassword("");
        return;
      }

      router.replace("/app/onboarding");
      router.refresh();
    } catch {
      setError("No pudimos crear tu cuenta en este momento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-black">Nombre</span>
        <input
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-sm font-black">Correo</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-sm font-black">Contraseña</span>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-sm font-black">Confirmar contraseña</span>
        <input
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={inputClass}
        />
      </label>

      {error && (
        <p className="rounded-2xl border border-[#FECACA] bg-[#FEE2E2] p-4 text-sm font-bold text-[#991B1B]">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-2xl border border-[#BBF7D0] bg-[#DCFCE7] p-4 text-sm font-bold text-[#166534]">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_100%)] px-6 py-4 text-center text-base font-black text-white shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creando cuenta..." : "Crear mi cuenta"}
      </button>

      <p className="text-center text-sm text-[#475569]">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-black text-[#2563EB]">
          Ingresar
        </Link>
      </p>
    </form>
  );
}
