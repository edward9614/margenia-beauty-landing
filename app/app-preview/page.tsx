import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Margenia Beta Preview",
  description: "Vista conceptual de la futura app Margenia Beta.",
};

const navigation = [
  { label: "Inicio", href: "#inicio" },
  { label: "Productos", href: "#productos" },
  { label: "Combos", href: "#combos" },
  { label: "Ventas", href: "#utilidad" },
  { label: "Caja", href: "#caja" },
  { label: "Inventario", href: "#inventario" },
  { label: "Configuración", href: "#preview" },
];

const mobileNavigation = navigation.filter(({ label }) =>
  ["Inicio", "Productos", "Ventas", "Caja"].includes(label),
);

const metrics = [
  {
    title: "Ventas del mes",
    value: "$3.450.000",
    detail: "42 ventas registradas",
    accent: "bg-[#EFF6FF] text-[#0891B2]",
  },
  {
    title: "Utilidad estimada",
    value: "$1.380.000",
    detail: "Margen promedio 39%",
    accent: "bg-[#dcfce7] text-[#047857]",
  },
  {
    title: "Por cobrar",
    value: "$280.000",
    detail: "4 clientas pendientes",
    accent: "bg-[#fef3c7] text-[#92400e]",
  },
  {
    title: "Stock bajo",
    value: "6 productos",
    detail: "Revisa tu inventario",
    accent: "bg-[#fee2e2] text-[#b91c1c]",
  },
];

const products = [
  ["Pestañina viral", "$18.000", "$39.900", "3", "Stock bajo"],
  ["Labial nude", "$9.500", "$24.900", "18", "OK"],
  ["Shampoo reparación", "$28.000", "$59.900", "0", "Agotado"],
  ["Serum vitamina C", "$22.000", "$49.900", "12", "OK"],
];

const combos = [
  ["Kit glow", "$89.900", "49%", "Rentable"],
  ["Rutina capilar", "$119.900", "41%", "Rentable"],
  ["Pack labios", "$54.900", "35%", "Revisar descuento"],
];

const movements = [
  ["Venta skincare", "+$120.000"],
  ["Empaques", "-$35.000"],
  ["Abono Natalia", "+$50.000"],
  ["Compra proveedor", "-$51.000"],
];

const pendingPayments = [
  ["Natalia", "$50.000", "Skincare"],
  ["Camila", "$80.000", "Kit glow"],
  ["Andrea", "$65.000", "Labial + serum"],
  ["Laura", "$85.000", "Rutina capilar"],
];

const inventoryMetrics = [
  ["Productos activos", "42"],
  ["Stock bajo", "6"],
  ["Agotados", "3"],
  ["Dinero quieto", "$420.000"],
];

export default function AppPreviewPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#111827]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <PreviewSidebar />

        <div className="min-w-0 flex-1 pb-24 lg:pb-0">
          <PreviewHeader />

          <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <section id="inicio" className="scroll-mt-24">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-[#06B6D4]">
                    Inicio
                  </p>
                  <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                    Resumen de tu negocio
                  </h1>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-[#6b7280]">
                    Visualiza lo que vendes, lo que gastas y cuánto estás ganando realmente.
                  </p>
                </div>
                <span className="inline-flex w-fit rounded-full bg-[#EFF6FF] px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-[#0891B2]">
                  Datos de ejemplo
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric, index) => (
                  <MetricCard key={metric.title} {...metric} index={index + 1} />
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.5fr_0.85fr]">
              <UtilityCard />
              <PendingPayments />
            </section>

            <ProductTable />
            <ComboSection />
            <CashSection />
            <InventorySection />
            <PreviewBanner />
          </main>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}

function PreviewSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-[#e5e7eb] bg-white px-4 py-6 lg:flex lg:flex-col">
      <Brand />

      <div className="mt-8 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-4">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[#0891B2]">
          Negocio activo
        </p>
        <p className="mt-2 text-sm font-black">Glow Beauty Store</p>
        <p className="mt-1 text-xs text-[#6b7280]">Belleza y cuidado personal</p>
      </div>

      <nav aria-label="Navegación de la app" className="mt-6 space-y-1">
        {navigation.map((item, index) => (
          <a
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition ${
              index === 0
                ? "bg-[#111827] text-white"
                : "text-[#4b5563] hover:bg-[#EFF6FF] hover:text-[#0891B2]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-[#BFDBFE]" : "bg-[#d1d5db]"}`}
            />
            {item.label}
          </a>
        ))}
      </nav>

      <div className="mt-auto border-t border-[#e5e7eb] pt-5">
        <p className="text-xs leading-5 text-[#6b7280]">
          Demo visual sin información real ni acciones de guardado.
        </p>
      </div>
    </aside>
  );
}

function PreviewHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e5e7eb] bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="lg:hidden">
          <Brand />
        </div>
        <div className="hidden lg:block">
          <p className="text-xs font-bold text-[#6b7280]">Glow Beauty Store</p>
          <p className="mt-0.5 text-sm font-black">Panel general</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden rounded-full bg-[#EFF6FF] px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-[#0891B2] sm:inline-flex">
            Beta preview
          </span>
          <span className="rounded-full border border-[#BFDBFE] bg-white px-3 py-2 text-xs font-black text-[#2563EB]">
            Vista conceptual
          </span>
        </div>
      </div>
    </header>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_55%,#06B6D4_100%)] text-sm font-black text-white">
        M
      </span>
      <div>
        <p className="text-lg font-black leading-none">Margenia</p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#06B6D4]">
          Beta
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  detail,
  accent,
  index,
}: {
  title: string;
  value: string;
  detail: string;
  accent: string;
  index: number;
}) {
  return (
    <article className="rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-[#6b7280]">{title}</p>
        <span className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-black ${accent}`}>
          {index}
        </span>
      </div>
      <p className="mt-5 text-2xl font-black tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-[#6b7280]">{detail}</p>
    </article>
  );
}

function UtilityCard() {
  const utilityRows = [
    ["Ingresos", "$3.450.000"],
    ["Costos", "$1.650.000"],
    ["Gastos", "$420.000"],
    ["Utilidad estimada", "$1.380.000"],
  ];
  const bars = [42, 58, 51, 72, 64, 84, 76, 92];

  return (
    <section id="utilidad" className="scroll-mt-24 rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-[#06B6D4]">Rentabilidad</p>
          <h2 className="mt-2 text-2xl font-black">Utilidad real</h2>
        </div>
        <span className="rounded-full bg-[#dcfce7] px-3 py-1.5 text-xs font-black text-[#047857]">
          Margen 39%
        </span>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[0.8fr_1.2fr] md:items-end">
        <div className="space-y-3">
          {utilityRows.map(([label, value], index) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b border-[#f0f1f4] pb-3 last:border-0">
              <span className="text-sm font-bold text-[#6b7280]">{label}</span>
              <span className={`text-sm font-black ${index === 3 ? "text-[#0891B2]" : "text-[#111827]"}`}>
                {value}
              </span>
            </div>
          ))}
        </div>

        <div>
          <div className="flex h-40 items-end gap-2 rounded-lg bg-[#f8fafc] p-4">
            {bars.map((height, index) => (
              <span
                key={`${height}-${index}`}
                className="flex-1 rounded-t-sm bg-[linear-gradient(180deg,#06B6D4_0%,#06B6D4_60%,#2563EB_100%)]"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-[0.08em] text-[#9ca3af]">
            <span>Semana 1</span>
            <span>Semana 4</span>
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-[#6b7280]">
        Vista estimada para ayudarte a entender la rentabilidad de tu negocio.
      </p>
    </section>
  );
}

function PendingPayments() {
  return (
    <section className="rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-[#06B6D4]">Cobros</p>
          <h2 className="mt-2 text-2xl font-black">Pagos pendientes</h2>
        </div>
        <span className="rounded-full bg-[#fef3c7] px-3 py-1.5 text-xs font-black text-[#92400e]">4 pendientes</span>
      </div>

      <div className="mt-5 space-y-2">
        {pendingPayments.map(([name, amount, concept]) => (
          <div key={name} className="grid grid-cols-[1fr_auto] gap-1 rounded-lg bg-[#f8fafc] px-3 py-3">
            <p className="text-sm font-black">{name}</p>
            <p className="text-sm font-black text-[#0891B2]">{amount}</p>
            <p className="col-span-2 text-xs text-[#6b7280]">{concept}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm leading-6 text-[#6b7280]">
        Así podrás recordar quién te debe y cuánto falta por cobrar.
      </p>
    </section>
  );
}

function ProductTable() {
  return (
    <section id="productos" className="scroll-mt-24 rounded-lg border border-[#e5e7eb] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#e5e7eb] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-[#2563EB]">Catálogo</p>
          <h2 className="mt-2 text-2xl font-black">Productos recientes</h2>
        </div>
        <span className="w-fit rounded-full bg-[#f3f4f6] px-3 py-1.5 text-xs font-black text-[#4b5563]">42 productos</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-[#f8fafc] text-xs uppercase tracking-[0.08em] text-[#6b7280]">
            <tr>
              {['Producto', 'Costo', 'Precio', 'Stock', 'Estado'].map((heading) => (
                <th key={heading} className="px-5 py-3 font-black">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef0f3]">
            {products.map(([name, cost, price, stock, status]) => (
              <tr key={name} className="text-sm">
                <td className="px-5 py-4 font-black">{name}</td>
                <td className="px-5 py-4 text-[#6b7280]">{cost}</td>
                <td className="px-5 py-4 font-bold">{price}</td>
                <td className="px-5 py-4 font-bold">{stock}</td>
                <td className="px-5 py-4"><StatusBadge status={status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ComboSection() {
  return (
    <section id="combos" className="scroll-mt-24">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.12em] text-[#06B6D4]">Promociones</p>
        <h2 className="mt-2 text-2xl font-black">Combos rentables</h2>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {combos.map(([name, price, margin, status], index) => (
          <article key={name} className="rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#EFF6FF] text-xs font-black text-[#0891B2]">
                {index + 1}
              </span>
              <StatusBadge status={status} />
            </div>
            <h3 className="mt-5 text-lg font-black">{name}</h3>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.08em] text-[#6b7280]">Precio sugerido</p>
            <p className="mt-1 text-2xl font-black">{price}</p>
            <div className="mt-4 flex items-center justify-between border-t border-[#eef0f3] pt-4">
              <span className="text-sm text-[#6b7280]">Margen estimado</span>
              <span className="text-sm font-black text-[#0891B2]">{margin}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CashSection() {
  return (
    <section id="caja" className="scroll-mt-24 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
      <div className="rounded-lg bg-[#111827] p-5 text-white sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.12em] text-[#BFDBFE]">Hoy</p>
            <h2 className="mt-2 text-2xl font-black">Caja del día</h2>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black">Preview</span>
        </div>

        <p className="mt-8 text-sm text-[#d1d5db]">Saldo estimado</p>
        <p className="mt-2 text-4xl font-black">$334.000</p>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/10 p-3">
            <p className="text-xs text-[#d1d5db]">Ingresos</p>
            <p className="mt-2 text-lg font-black text-[#86efac]">$420.000</p>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <p className="text-xs text-[#d1d5db]">Gastos</p>
            <p className="mt-2 text-lg font-black text-[#fca5a5]">$86.000</p>
          </div>
        </div>
        <button
          type="button"
          className="mt-6 w-full rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_50%,#06B6D4_100%)] px-4 py-3 text-sm font-black text-white"
        >
          + Registrar movimiento
        </button>
      </div>

      <div className="rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-black">Últimos movimientos</h3>
          <span className="text-xs font-bold text-[#6b7280]">15 de junio</span>
        </div>
        <div className="mt-5 divide-y divide-[#eef0f3]">
          {movements.map(([label, amount]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${amount.startsWith('+') ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`} />
                <span className="text-sm font-bold">{label}</span>
              </div>
              <span className={`text-sm font-black ${amount.startsWith('+') ? 'text-[#047857]' : 'text-[#b91c1c]'}`}>
                {amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InventorySection() {
  return (
    <section id="inventario" className="scroll-mt-24 rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-sm sm:p-6">
      <div className="max-w-2xl">
        <p className="text-sm font-black uppercase tracking-[0.12em] text-[#2563EB]">Control de stock</p>
        <h2 className="mt-2 text-2xl font-black">Inventario inteligente</h2>
        <p className="mt-3 text-sm leading-6 text-[#6b7280]">
          Identifica productos que se agotan rápido y productos que llevan tiempo sin moverse.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {inventoryMetrics.map(([label, value], index) => (
          <div key={label} className="rounded-lg bg-[#f8fafc] p-4 ring-1 ring-[#e5e7eb]">
            <span className={`block h-1.5 w-12 rounded-full ${index === 0 ? 'bg-[#2563EB]' : index === 1 ? 'bg-[#f59e0b]' : index === 2 ? 'bg-[#ef4444]' : 'bg-[#06B6D4]'}`} />
            <p className="mt-4 text-sm font-bold text-[#6b7280]">{label}</p>
            <p className="mt-2 text-2xl font-black">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PreviewBanner() {
  return (
    <section id="preview" className="scroll-mt-24 overflow-hidden rounded-lg bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_48%,#06B6D4_100%)] px-5 py-8 text-white sm:px-8 sm:py-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <span className="inline-flex rounded-full bg-white/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em]">
            Vista conceptual
          </span>
          <h2 className="mt-4 text-2xl font-black sm:text-3xl">Esto es una vista previa de Margenia Beta</h2>
          <p className="mt-3 text-sm leading-6 text-white/85 sm:text-base">
            Estamos construyendo esta experiencia con emprendedoras reales. Algunas funciones están en desarrollo y se integrarán progresivamente.
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-full bg-white px-5 py-3 text-center text-sm font-black text-[#2563EB] transition hover:bg-[#EFF6FF]"
        >
          Volver a la landing
        </Link>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "OK" || status === "Rentable"
      ? "bg-[#dcfce7] text-[#047857]"
      : status === "Stock bajo" || status === "Revisar descuento"
        ? "bg-[#fef3c7] text-[#92400e]"
        : "bg-[#fee2e2] text-[#b91c1c]";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${classes}`}>
      {status}
    </span>
  );
}

function MobileBottomNav() {
  return (
    <nav
      aria-label="Navegación móvil de la app"
      className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-lg border border-[#e5e7eb] bg-white/95 p-2 shadow-lg backdrop-blur lg:hidden"
    >
      {mobileNavigation.map((item, index) => (
        <a
          key={item.label}
          href={item.href}
          className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-black ${
            index === 0 ? "bg-[#EFF6FF] text-[#0891B2]" : "text-[#6b7280]"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${index === 0 ? "bg-[#06B6D4]" : "bg-[#d1d5db]"}`} />
          <span className="truncate">{item.label}</span>
        </a>
      ))}
    </nav>
  );
}
