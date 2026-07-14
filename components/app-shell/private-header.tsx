import { BrandLogo } from "@/components/brand-logo";

export function PrivateHeader({ businessName, email }: { businessName?: string; email?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#050E1A]/95 px-4 py-3 text-white shadow-[0_10px_30px_rgba(2,6,23,0.12)] backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex max-w-[132px] items-center rounded-lg bg-white px-2.5 py-2 shadow-sm [&_img]:max-w-full"><BrandLogo compact showImage /></div>
        <div className="min-w-0 text-right">
          <p className="truncate text-xs font-black text-slate-100">{businessName || "Tu negocio"}</p>
          <p className="mt-0.5 max-w-[170px] truncate text-[0.65rem] font-semibold text-slate-500">{email || "Sesión activa"}</p>
        </div>
      </div>
    </header>
  );
}
