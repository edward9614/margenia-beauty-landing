import Link from "next/link";

function getSteps(
  hasCombos: boolean,
  hasInventory: boolean,
  hasProducts: boolean,
  hasSales: boolean,
  hasSettingsComplete: boolean,
) {
  return [
    { complete: true, href: "/app", label: "Cuenta creada" },
    { complete: hasSettingsComplete, href: "/app/configuracion", label: "Configuración" },
    { complete: hasProducts, href: "/app/productos/nuevo", label: "Primer producto" },
    { complete: hasCombos, href: "/app/combos/nuevo", label: "Primer combo" },
    { complete: hasInventory, href: "/app/inventario", label: "Inventario configurado" },
    { complete: hasSales, href: "/app/ventas/nueva", label: "Primera venta" },
  ];
}

export function ActivationProgressCard({
  hasCombos = false,
  hasInventory = false,
  hasProducts = false,
  hasSales = false,
  hasSettingsComplete = false,
}: {
  hasCombos?: boolean;
  hasInventory?: boolean;
  hasProducts?: boolean;
  hasSales?: boolean;
  hasSettingsComplete?: boolean;
}) {
  const steps = getSteps(hasCombos, hasInventory, hasProducts, hasSales, hasSettingsComplete);
  const completed = steps.filter((step) => step.complete).length;
  const progress = Math.round((completed / steps.length) * 100);
  const nextStep = steps.find((step) => !step.complete);

  if (progress >= 100) {
    return (
      <section className="rounded-[2rem] border border-[#BBF7D0] bg-[linear-gradient(135deg,#F0FDF4_0%,#FFFFFF_58%,#EFF6FF_100%)] p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#16A34A]">
              Activación completa
            </p>
            <h2 className="mt-3 text-2xl font-black text-[#0F172A]">
              Tu negocio está listo
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#475569]">
              Ya puedes operar con productos, ventas, inventario y caja.
            </p>
          </div>
          <Link
            href="/app/ventas/nueva"
            className="w-full rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_100%)] px-5 py-3 text-center text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 sm:w-fit"
          >
            Registrar venta
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-[#E2E8F0] bg-[linear-gradient(135deg,#FFFFFF_0%,#F8FAFC_58%,#EFF6FF_100%)] p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2563EB]">
            Activación
          </p>
          <h2 className="mt-3 text-2xl font-black text-[#0F172A]">
            Prepara tu negocio para empezar
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#475569]">
            Completa estos primeros pasos para activar las funciones principales de
            Margenia.
          </p>
        </div>
        <div className="rounded-2xl border border-[#BFDBFE] bg-white px-5 py-4 text-center shadow-sm">
          <p className="text-3xl font-black text-[#2563EB]">{progress}%</p>
          <p className="mt-1 text-xs font-bold text-[#475569]">
            {completed} de {steps.length} pasos completados
          </p>
        </div>
      </div>

      <div className="mt-6 h-3 overflow-hidden rounded-full bg-[#E2E8F0]">
        <div
          className="h-full rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_100%)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {steps.map((step) => (
          <span
            key={step.label}
            className={`rounded-full px-3 py-1.5 text-xs font-black ${
              step.complete
                ? "bg-[#DCFCE7] text-[#166534]"
                : "bg-[#F8FAFC] text-[#475569] ring-1 ring-[#E2E8F0]"
            }`}
          >
            {step.label}
          </span>
        ))}
      </div>

      {nextStep && (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href={nextStep.href}
            className="rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_100%)] px-5 py-3 text-center text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
          >
            Continuar configuración
          </Link>
          <p className="text-sm font-bold text-[#475569]">
            Siguiente paso: {nextStep.label}
          </p>
        </div>
      )}
    </section>
  );
}
