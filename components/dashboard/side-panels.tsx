import Link from "next/link";

type BusinessInfo = {
  businessType: string | null;
  country: string | null;
  currency: string;
  name: string;
  primaryChannel: string | null;
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#E2E8F0] py-3 last:border-0">
      <span className="text-sm font-bold text-[#475569]">{label}</span>
      <span className="text-right text-sm font-black text-[#0F172A]">
        {value || "Sin definir"}
      </span>
    </div>
  );
}

export function AlertsCard() {
  return (
    <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-[#0F172A]">Alertas</h2>
      <div className="mt-5 rounded-3xl bg-[#F8FAFC] p-4">
        <p className="font-black text-[#0F172A]">Sin alertas por ahora</p>
        <p className="mt-2 text-sm leading-6 text-[#475569]">
          Margenia te avisará sobre stock bajo, pagos pendientes y movimientos
          importantes.
        </p>
      </div>
    </section>
  );
}

export function MargeniaInsightCard({
  hasCombos,
  hasProducts,
  hasSales,
  hasSettingsComplete,
}: {
  hasCombos: boolean;
  hasProducts: boolean;
  hasSales: boolean;
  hasSettingsComplete: boolean;
}) {
  const insight = !hasSettingsComplete
    ? {
        cta: "Ir a configuración",
        href: "/app/configuracion",
        text: "Completa los datos base de tu negocio para que Margenia pueda adaptar moneda, país y operación.",
        title: "Completa la configuración de tu negocio",
      }
    : !hasProducts
      ? {
          cta: "Crear producto",
          href: "/app/productos/nuevo",
          text: "Registrar costos, precios y existencias te permitirá calcular utilidad, detectar stock bajo y crear combos rentables.",
          title: "Empieza organizando tus productos",
        }
      : !hasCombos
        ? {
            cta: "Crear combo",
            href: "/app/combos/nuevo",
            text: "Agrupa productos para vender promociones más claras sin perder margen.",
            title: "Crea tu primer combo",
          }
        : !hasSales
          ? {
              cta: "Registrar venta",
              href: "/app/ventas/nueva",
              text: "Registra tu primera venta para empezar a ver utilidad, caja y evolución del negocio.",
              title: "Registra tu primera venta",
            }
          : {
              cta: "Registrar venta",
              href: "/app/ventas/nueva",
              text: "Sigue operando con ventas, inventario y caja.",
              title: "Tu negocio ya está listo",
            };

  return (
    <section className="rounded-[2rem] border border-[#BFDBFE] bg-[#EFF6FF] p-5 shadow-sm">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
        Consejo de Margenia
      </p>
      <h2 className="mt-3 text-xl font-black text-[#0F172A]">
        {insight.title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-[#475569]">
        {insight.text}
      </p>
      <Link
        href={insight.href}
        className="mt-5 block w-full rounded-full bg-white px-4 py-3 text-center text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE] transition hover:bg-[#F8FAFC] hover:text-[#1D4ED8]"
      >
        {insight.cta}
      </Link>
    </section>
  );
}

export function BusinessStatusCard({ business }: { business: BusinessInfo }) {
  return (
    <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-[#0F172A]">Estado de configuración</h2>
      <div className="mt-4">
        <InfoRow label="Nombre" value={business.name} />
        <InfoRow label="Tipo" value={business.businessType} />
        <InfoRow label="País" value={business.country} />
        <InfoRow label="Moneda" value={business.currency} />
        <InfoRow label="Canal" value={business.primaryChannel} />
      </div>
      <Link
        href="/app/configuracion"
        className="mt-5 block w-full rounded-full bg-[#F8FAFC] px-4 py-3 text-center text-sm font-black text-[#475569] ring-1 ring-[#E2E8F0] transition hover:bg-[#EFF6FF] hover:text-[#2563EB]"
      >
        Editar configuración
      </Link>
    </section>
  );
}
