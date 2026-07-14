import Link from "next/link";
import { SemanticBadge, type SemanticTone } from "@/components/ui/semantic";
import type { RecentActivityItem, RecentActivityType } from "@/lib/dashboard/activity";

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", { day: "2-digit", month: "2-digit", timeZone: "America/Bogota", year: "numeric" });
const shortDateFormatter = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "America/Bogota" });
const timeFormatter = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });

function dateKey(date: Date) {
  const parts = dateKeyFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";
  return `${year}-${month}-${day}`;
}

function friendlyDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const today = dateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const itemDay = dateKey(date);
  const time = timeFormatter.format(date);
  if (itemDay === today) return `Hoy, ${time}`;
  if (itemDay === dateKey(yesterday)) return `Ayer, ${time}`;
  return `${shortDateFormatter.format(date).replace(".", "")}, ${time}`;
}

function activityTone(type: RecentActivityType): SemanticTone {
  if (type === "sale_created") return "info";
  if (type === "sale_voided") return "negative";
  if (type === "inventory_count" || type === "combo_created") return "brand";
  if (type === "inventory_movement") return "positive";
  return "neutral";
}

function activityGlyph(type: RecentActivityType) {
  if (type === "sale_created") return "$";
  if (type === "sale_voided") return "!";
  if (type === "inventory_count") return "#";
  if (type === "inventory_movement") return "+";
  if (type === "combo_created") return "C";
  return "P";
}

const activityStyles: Record<SemanticTone, string> = {
  brand: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
  info: "border-blue-300/20 bg-blue-300/10 text-blue-200",
  negative: "border-rose-300/20 bg-rose-300/10 text-rose-200",
  neutral: "border-white/10 bg-white/[0.05] text-slate-300",
  positive: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  warning: "border-amber-300/20 bg-amber-300/10 text-amber-200",
};

export function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  return (
    <section className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:p-6">
      <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">Operación</p><h2 className="mt-2 text-xl font-black text-white">Actividad reciente</h2></div>{items.length > 0 && <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-black text-slate-400">Últimas {items.length}</span>}</div>
      {items.length > 0 ? (
        <ol className="relative mt-5 space-y-1 before:absolute before:bottom-4 before:left-5 before:top-4 before:w-px before:bg-white/[0.08]">
          {items.map((item, index) => {
            const tone = activityTone(item.type);
            return (
              <li key={item.id} className={`relative grid gap-3 rounded-xl px-1 py-3 transition hover:bg-white/[0.035] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center ${index > 4 ? "hidden sm:grid" : ""}`}>
                <div className={`relative z-10 grid h-10 w-10 place-items-center rounded-xl border text-sm font-black ${activityStyles[tone]}`}>{activityGlyph(item.type)}</div>
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-100">{item.title}</h3>{item.badge && <SemanticBadge tone={tone} className="px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.08em]">{item.badge}</SemanticBadge>}</div><p className="mt-1 text-sm font-semibold leading-5 text-slate-400">{item.description}</p><p className="mt-1 text-xs font-bold text-slate-600">{friendlyDate(item.date)}</p></div>
                {item.href && <Link href={item.href} className="w-fit rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-black text-slate-300 transition hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Ver</Link>}
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-black/10 px-5 py-10 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-xl font-black text-cyan-200">+</div><h3 className="mt-4 text-lg font-black text-white">Tu actividad aparecerá aquí</h3><p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500">Cuando agregues productos, ventas o movimientos podrás consultarlos desde este espacio.</p></div>
      )}
    </section>
  );
}
