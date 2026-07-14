import Link from "next/link";

function getSteps(hasCombos: boolean, hasInventory: boolean, hasProducts: boolean, hasSales: boolean, hasSettingsComplete: boolean) {
  return [
    { complete: true, href: "/app", label: "Cuenta creada" },
    { complete: hasSettingsComplete, href: "/app/configuracion", label: "Configuración" },
    { complete: hasProducts, href: "/app/productos/nuevo", label: "Primer producto" },
    { complete: hasCombos, href: "/app/combos/nuevo", label: "Primer combo" },
    { complete: hasInventory, href: "/app/inventario", label: "Inventario" },
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
  const pendingSteps = steps.filter((step) => !step.complete);
  const nextStep = pendingSteps[0];

  if (progress >= 100 || completed === steps.length) return null;

  return (
    <section className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.055] p-4 backdrop-blur-sm sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3"><p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Activación</p><span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-black text-slate-300">{progress}%</span></div>
          <h2 className="mt-2 text-lg font-black text-white">Completa la base operativa de tu negocio</h2>
          <div className="mt-3 flex flex-wrap gap-2">{pendingSteps.map((step) => <span key={step.label} className="rounded-full border border-white/[0.08] bg-black/15 px-3 py-1.5 text-xs font-bold text-slate-400">{step.label}</span>)}</div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.08]"><span className="block h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
        </div>
        {nextStep && <Link href={nextStep.href} className="inline-flex min-h-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-cyan-950/30 transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Continuar configuración</Link>}
      </div>
    </section>
  );
}
