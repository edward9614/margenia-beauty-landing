import {
  getPaymentMethodLabel,
  type CashTimelineItem,
} from "@/lib/cash-register";

type Tone = "amber" | "blue" | "green" | "red" | "slate";

const glowStyles: Record<Tone, string> = {
  amber: "bg-amber-300/10",
  blue: "bg-cyan-300/10",
  green: "bg-emerald-300/10",
  red: "bg-rose-300/10",
  slate: "bg-slate-300/10",
};

const darkToneStyles: Record<
  Tone,
  { badge: string; border: string; icon: string; meter: string; soft: string; text: string }
> = {
  amber: {
    badge: "bg-amber-300/10 text-amber-200 ring-amber-300/20",
    border: "border-l-amber-300/70",
    icon: "bg-amber-300/10 text-amber-200 ring-amber-300/20",
    meter: "bg-gradient-to-r from-amber-400 to-orange-300",
    soft: "bg-amber-300/[0.055]",
    text: "text-amber-200",
  },
  blue: {
    badge: "bg-cyan-300/10 text-cyan-200 ring-cyan-300/20",
    border: "border-l-cyan-300/70",
    icon: "bg-cyan-300/10 text-cyan-200 ring-cyan-300/20",
    meter: "bg-gradient-to-r from-blue-500 to-cyan-300",
    soft: "bg-cyan-300/[0.055]",
    text: "text-cyan-200",
  },
  green: {
    badge: "bg-emerald-300/10 text-emerald-200 ring-emerald-300/20",
    border: "border-l-emerald-300/70",
    icon: "bg-emerald-300/10 text-emerald-200 ring-emerald-300/20",
    meter: "bg-gradient-to-r from-emerald-500 to-emerald-300",
    soft: "bg-emerald-300/[0.055]",
    text: "text-emerald-200",
  },
  red: {
    badge: "bg-rose-300/10 text-rose-200 ring-rose-300/20",
    border: "border-l-rose-300/70",
    icon: "bg-rose-300/10 text-rose-200 ring-rose-300/20",
    meter: "bg-gradient-to-r from-rose-500 to-red-300",
    soft: "bg-rose-300/[0.055]",
    text: "text-rose-200",
  },
  slate: {
    badge: "bg-white/[0.06] text-slate-300 ring-white/10",
    border: "border-l-slate-400/60",
    icon: "bg-white/[0.06] text-slate-300 ring-white/10",
    meter: "bg-slate-500",
    soft: "bg-white/[0.035]",
    text: "text-slate-300",
  },
};

function toneStyles(tone: Tone) {
  return darkToneStyles[tone];
}

function MiniIcon({ kind }: { kind: "cash" | "difference" | "out" | "sale" }) {
  if (kind === "sale") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M8 15v-4M12 15V8M16 15v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "out") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="m6 13 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === "difference") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M6 8h12M6 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M9 5 6 8l3 3M15 13l3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17.5v-10Z" stroke="currentColor" strokeWidth="2" />
      <path d="M16 13h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function movementTone(item: CashTimelineItem): Tone {
  if (item.type === "sale") return "blue";
  if (item.movementType === "adjustment") return "amber";
  if (item.direction === "in") return "green";
  if (item.direction === "out") return "red";
  return "slate";
}

function movementBadge(item: CashTimelineItem) {
  if (item.type === "sale") return "Venta";
  if (item.movementType === "adjustment") return "Ajuste";
  if (item.direction === "in") return "Ingreso";
  if (item.direction === "out") return "Egreso";
  return "Movimiento";
}

export function CashSummaryCard({
  icon,
  label,
  tone,
  value,
}: {
  icon: "cash" | "difference" | "out" | "sale";
  label: string;
  tone: Tone;
  value: string;
}) {
  const styles = toneStyles(tone);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.065]">
      <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl ${glowStyles[tone]}`} />
      <div className="relative flex items-start justify-between gap-4">
        <div className={`grid h-12 w-12 place-items-center rounded-2xl ring-1 ${styles.icon}`}>
          <MiniIcon kind={icon} />
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ring-1 ${styles.badge}`}>
          Caja
        </span>
      </div>
      <p className="relative mt-5 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="relative mt-2 text-2xl font-black tracking-normal text-white">
        {value}
      </p>
      <div className={`relative mt-4 h-1.5 overflow-hidden rounded-full ${styles.soft}`}>
        <span className={`block h-full w-2/3 rounded-full ${styles.meter} transition-all duration-500`} />
      </div>
    </div>
  );
}

export function UsageProgressBar({
  percentage,
  tone = "blue",
}: {
  percentage: number;
  tone?: Tone;
}) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
      <span
        className={`block h-full rounded-full ${toneStyles(tone).meter} transition-all duration-500`}
        style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
      />
    </div>
  );
}

export function PaymentMethodUsageCard({
  amount,
  formatter,
  isTop,
  manualOut,
  paymentMethod,
  percentage,
  sales,
}: {
  amount: number;
  formatter: Intl.NumberFormat;
  isTop: boolean;
  manualOut: number;
  paymentMethod: string;
  percentage: number;
  sales: number;
}) {
  const tone: Tone = amount > 0 ? (isTop ? "blue" : "green") : "slate";
  const styles = toneStyles(tone);

  return (
    <div className={`rounded-2xl border p-4 transition duration-300 hover:-translate-y-0.5 ${amount > 0 ? "border-white/10 bg-white/[0.045] hover:border-cyan-300/25" : "border-white/[0.07] bg-white/[0.025] opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-black text-white">{getPaymentMethodLabel(paymentMethod)}</p>
            {isTop && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] ring-1 ${styles.badge}`}>
                Más usado
              </span>
            )}
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Ventas {formatter.format(sales)} · Salidas {formatter.format(manualOut)}
          </p>
        </div>
        <p className={`text-sm font-black ${styles.text}`}>{Math.round(percentage)}%</p>
      </div>
      <p className="mt-4 text-xl font-black text-white">{formatter.format(amount)}</p>
      <div className="mt-3">
        <UsageProgressBar percentage={percentage} tone={tone} />
      </div>
    </div>
  );
}

export function MovementTypeBadge({ item }: { item: CashTimelineItem }) {
  const tone = movementTone(item);

  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ring-1 ${toneStyles(tone).badge}`}>
      {movementBadge(item)}
    </span>
  );
}

export function CashMovementItem({
  formatter,
  formatDateTime,
  item,
}: {
  formatter: Intl.NumberFormat;
  formatDateTime: (value?: string | null) => string;
  item: CashTimelineItem;
}) {
  const tone = movementTone(item);
  const styles = toneStyles(tone);
  const sign = item.direction === "in" ? "+" : "-";

  return (
    <div className={`rounded-2xl border border-white/[0.08] border-l-4 ${styles.border} ${styles.soft} p-4 transition duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.07]`}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_0.8fr_0.8fr_auto] md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <MovementTypeBadge item={item} />
            <p className="truncate font-black text-white">{item.title}</p>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">{formatDateTime(item.occurredAt)}</p>
          {(item.description || item.category) && (
            <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-400">
              {item.category ? `${item.category} · ` : ""}
              {item.description}
            </p>
          )}
        </div>
        <p className="text-sm font-semibold text-slate-400">{getPaymentMethodLabel(item.method)}</p>
        <p className="text-sm font-semibold text-slate-400">{item.reference}</p>
        <p className={`text-right text-lg font-black ${styles.text}`}>
          {sign} {formatter.format(item.amount)}
        </p>
      </div>
    </div>
  );
}
