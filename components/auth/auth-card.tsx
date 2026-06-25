import Link from "next/link";
import type { ReactNode } from "react";

export function AuthCard({
  children,
  eyebrow,
  subtitle,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  subtitle: string;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_80%_12%,#E0F7FA_0%,transparent_30%),linear-gradient(135deg,#FFFFFF_0%,#F8FAFC_52%,#EFF6FF_100%)] px-5 py-10 text-[#0F172A]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section className="w-full max-w-md rounded-[2rem] border border-[#E2E8F0] bg-white/95 p-6 shadow-xl shadow-[#0F172A]/5 backdrop-blur sm:p-8">
          <Link href="/" className="text-2xl font-black tracking-tight text-[#0F172A]">
            Margenia
          </Link>
          <p className="mt-8 text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-black">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[#475569]">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </section>
      </div>
    </main>
  );
}
