import type { ReactNode } from "react";

export function MetricCard({
  detail,
  icon,
  title,
}: {
  detail: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
          {icon}
        </div>
        <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#64748B] ring-1 ring-[#E2E8F0]">
          Sin datos
        </span>
      </div>
      <p className="mt-5 text-sm font-black text-[#475569]">{title}</p>
      <p className="mt-2 text-4xl font-black tracking-tight text-[#0F172A]">—</p>
      <p className="mt-3 text-sm leading-6 text-[#475569]">{detail}</p>
    </article>
  );
}
