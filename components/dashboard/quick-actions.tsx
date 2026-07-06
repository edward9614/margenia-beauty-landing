import Link from "next/link";
import { BoxIcon, SalesIcon } from "@/components/dashboard/dashboard-icons";
import { HelpTooltip } from "@/components/ui/help-tooltip";

export function QuickActions({
  hasCatalog = false,
  hasProducts = false,
}: {
  hasCatalog?: boolean;
  hasProducts?: boolean;
}) {
  const hasOperationalBase = hasCatalog || hasProducts;
  const actions = [
    {
      href: "/app/productos/nuevo",
      icon: <BoxIcon className="h-4 w-4" />,
      label: "Producto",
      title: "Agregar producto",
    },
    {
      href: "/app/combos/nuevo",
      icon: <LayersIcon />,
      label: "Combo",
      title: "Crear combo",
    },
    {
      href: "/app/ventas/nueva",
      icon: <SalesIcon className="h-4 w-4" />,
      label: "Venta",
      title: "Registrar venta",
    },
    {
      href: "/app/inventario/ajuste",
      icon: <MovementIcon />,
      label: "Movimiento",
      title: "Registrar movimiento",
    },
    {
      href: "/app/reportes",
      icon: <ChartIcon />,
      label: "Reportes",
      title: "Ver reportes",
    },
  ];

  return (
    <section className="rounded-3xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-[#0F172A]">Acciones rápidas</h2>
            <HelpTooltip
              title="Acciones rápidas"
              content="Accesos directos para registrar las operaciones más comunes de tu negocio."
              example="Crear producto, registrar venta o revisar reportes."
            />
          </div>
          <p className="mt-1 text-sm font-bold text-[#64748B]">
            {hasOperationalBase
              ? "Atajos para operar tu negocio."
              : "Empieza creando tu primer producto o revisa tus reportes."}
          </p>
        </div>
      </div>
      <div className="-mx-1 mt-4 flex snap-x gap-3 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            title={action.title}
            className="inline-flex h-11 shrink-0 snap-start items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-sm font-black text-[#0F172A] transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#2563EB] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#BFDBFE]/70"
          >
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-white text-[#2563EB] shadow-sm ring-1 ring-[#E2E8F0]">
              {action.icon}
            </span>
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function LayersIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="m12 4 8 4-8 4-8-4 8-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m4 12 8 4 8-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m4 16 8 4 8-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MovementIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M7 7h11l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 17H6l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 7 6 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 15v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 15V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 15v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
