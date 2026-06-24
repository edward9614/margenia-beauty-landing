import { signOut } from "@/app/(dashboard)/app/actions";

export function PrivateHeader({ email }: { email?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E2E8F0] bg-[#F8FAFC]/90 px-5 py-4 backdrop-blur lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2563EB]">
            App Beta
          </p>
          <p className="mt-1 text-sm font-bold text-[#475569]">
            {email || "Sesión activa"}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE] transition hover:bg-[#EFF6FF]"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </header>
  );
}
