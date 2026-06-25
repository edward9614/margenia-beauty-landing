export function PrivateHeader({ email }: { email?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E2E8F0] bg-[#F8FAFC]/90 px-5 py-4 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2563EB]">
            App Beta
          </p>
          <p className="mt-1 text-sm font-bold text-[#475569]">
            {email || "Sesión activa"}
          </p>
        </div>
        <span className="rounded-full bg-[#E0F7FA] px-3 py-1.5 text-xs font-black text-[#0891B2] ring-1 ring-[#A5F3FC]">
          Beta
        </span>
      </div>
    </header>
  );
}
