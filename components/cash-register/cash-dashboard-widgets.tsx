import {
  getPaymentMethodLabel,
  type CashTimelineItem,
} from "@/lib/cash-register";
import {
  semanticToneStyles,
  UsageProgressBar as SemanticUsageProgressBar,
  type SemanticTone,
} from "@/components/ui/semantic";

type Tone = "amber" | "blue" | "green" | "red" | "slate";

const toneMap: Record<Tone, SemanticTone> = {
  amber: "warning",
  blue: "info",
  green: "positive",
  red: "negative",
  slate: "neutral",
};

const glowStyles: Record<Tone, string> = {
  amber: "bg-[#F59E0B]/10",
  blue: "bg-[#2563EB]/10",
  green: "bg-[#16A34A]/10",
  red: "bg-[#EF4444]/10",
  slate: "bg-[#64748B]/10",
};

function toneStyles(tone: Tone) {
  return semanticToneStyles[toneMap[tone]];
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
    <div className={`group relative overflow-hidden rounded-[1.6rem] border border-[#E2E8F0] bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#0F172A]/8`}>
      <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl ${glowStyles[tone]}`} />
      <div className="relative flex items-start justify-between gap-4">
        <div className={`grid h-12 w-12 place-items-center rounded-2xl ring-1 ${styles.icon}`}>
          <MiniIcon kind={icon} />
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ring-1 ${styles.badge}`}>
          Caja
        </span>
      </div>
      <p className="relative mt-5 text-xs font-black uppercase tracking-[0.12em] text-[#64748B]">
        {label}
      </p>
      <p className="relative mt-2 text-2xl font-black tracking-tight text-[#0F172A]">
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
    <SemanticUsageProgressBar percentage={percentage} tone={toneMap[tone]} />
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
    <div className={`rounded-2xl border p-4 transition duration-300 hover:-translate-y-0.5 ${amount > 0 ? "border-[#BFDBFE] bg-white shadow-sm" : "border-[#E2E8F0] bg-[#F8FAFC] opacity-75"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-black text-[#0F172A]">{getPaymentMethodLabel(paymentMethod)}</p>
            {isTop && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] ring-1 ${styles.badge}`}>
                Más usado
              </span>
            )}
          </div>
          <p className="mt-1 text-xs font-bold text-[#64748B]">
            Ventas {formatter.format(sales)} · Salidas {formatter.format(manualOut)}
          </p>
        </div>
        <p className={`text-sm font-black ${styles.text}`}>{Math.round(percentage)}%</p>
      </div>
      <p className="mt-4 text-xl font-black text-[#0F172A]">{formatter.format(amount)}</p>
      <div className="mt-3">
        <SemanticUsageProgressBar percentage={percentage} tone={toneMap[tone]} />
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
    <div className={`rounded-2xl border border-[#E2E8F0] border-l-4 ${styles.border} ${styles.soft} p-4 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm`}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_0.8fr_0.8fr_auto] md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <MovementTypeBadge item={item} />
            <p className="truncate font-black text-[#0F172A]">{item.title}</p>
          </div>
          <p className="mt-1 text-xs font-bold text-[#64748B]">{formatDateTime(item.occurredAt)}</p>
          {(item.description || item.category) && (
            <p className="mt-2 line-clamp-2 text-xs font-bold text-[#475569]">
              {item.category ? `${item.category} · ` : ""}
              {item.description}
            </p>
          )}
        </div>
        <p className="text-sm font-bold text-[#475569]">{getPaymentMethodLabel(item.method)}</p>
        <p className="text-sm font-bold text-[#475569]">{item.reference}</p>
        <p className={`text-right text-lg font-black ${styles.text}`}>
          {sign} {formatter.format(item.amount)}
        </p>
      </div>
    </div>
  );
}
