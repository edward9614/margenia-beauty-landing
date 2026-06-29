import Link from "next/link";
import { EmptyActivityIcon } from "@/components/dashboard/dashboard-icons";
import type { RecentActivityItem, RecentActivityType } from "@/lib/dashboard/activity";

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Bogota",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  timeZone: "America/Bogota",
});

const timeFormatter = new Intl.DateTimeFormat("es-CO", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

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

function toneClass(type: RecentActivityType) {
  if (type === "sale_created") return "bg-[#EFF6FF] text-[#2563EB]";
  if (type === "sale_voided") return "bg-[#FEF2F2] text-[#B91C1C]";
  if (type === "inventory_count") return "bg-[#ECFEFF] text-[#0891B2]";
  if (type === "inventory_movement") return "bg-[#F0FDF4] text-[#16A34A]";
  if (type === "combo_created") return "bg-[#F5F3FF] text-[#7C3AED]";
  return "bg-[#F8FAFC] text-[#475569]";
}

function activityGlyph(type: RecentActivityType) {
  if (type === "sale_created") return "$";
  if (type === "sale_voided") return "!";
  if (type === "inventory_count") return "#";
  if (type === "inventory_movement") return "+";
  if (type === "combo_created") return "C";
  return "P";
}

export function RecentActivity({
  items,
}: {
  items: RecentActivityItem[];
}) {
  return (
    <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-left text-xl font-black text-[#0F172A]">Actividad reciente</h2>
        {items.length > 0 && (
          <span className="rounded-full bg-[#F8FAFC] px-3 py-1.5 text-xs font-black text-[#475569] ring-1 ring-[#E2E8F0]">
            Últimas {items.length}
          </span>
        )}
      </div>

      {items.length > 0 ? (
        <div className="mt-5 divide-y divide-[#E2E8F0]">
          {items.map((item, index) => (
            <article
              key={item.id}
              className={`grid gap-3 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center ${
                index > 4 ? "hidden sm:grid" : ""
              }`}
            >
              <div className={`grid h-10 w-10 place-items-center rounded-2xl text-sm font-black ${toneClass(item.type)}`}>
                {activityGlyph(item.type)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black text-[#0F172A]">{item.title}</h3>
                  {item.badge && (
                    <span className="rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#2563EB]">
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-bold leading-6 text-[#475569]">{item.description}</p>
                <p className="mt-1 text-xs font-black text-[#64748B]">{friendlyDate(item.date)}</p>
              </div>
              {item.href && (
                <Link
                  href={item.href}
                  className="w-fit rounded-full border border-[#BFDBFE] bg-white px-4 py-2 text-xs font-black text-[#2563EB] transition hover:bg-[#EFF6FF]"
                >
                  Ver
                </Link>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <EmptyActivityIcon />
          <h3 className="mt-5 text-lg font-black text-[#0F172A]">
            Tu actividad aparecerá aquí
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#475569]">
            Cuando agregues productos, registres ventas o realices movimientos, podrás
            consultarlos desde este espacio.
          </p>
        </div>
      )}
    </section>
  );
}
