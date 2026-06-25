function getSteps(hasProducts: boolean) {
  return [
    {
      detail: "Tu usuario ya está activo.",
      status: "completed",
      title: "Crear tu cuenta",
    },
    {
      detail: "El negocio base ya está configurado.",
      status: "completed",
      title: "Configurar tu negocio",
    },
    {
      detail: hasProducts
        ? "Ya tienes al menos un producto en tu catálogo."
        : "Será el primer módulo operativo de Margenia.",
      status: hasProducts ? "completed" : "next",
      title: "Agregar tu primer producto",
    },
    {
      detail: "Después podrás crear promociones con margen claro.",
      status: hasProducts ? "next" : "pending",
      title: "Crear tu primer combo",
    },
    {
      detail: "Las métricas aparecerán con tus primeras ventas.",
      status: "pending",
      title: "Registrar tu primera venta",
    },
  ];
}

export function SetupChecklist({ hasProducts = false }: { hasProducts?: boolean }) {
  const steps = getSteps(hasProducts);

  return (
    <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-black text-[#0F172A]">Primeros pasos en Margenia</h2>
      <div className="mt-6 space-y-0">
        {steps.map((step, index) => (
          <div key={step.title} className="grid grid-cols-[2rem_1fr] gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${
                  step.status === "completed"
                    ? "bg-[#DCFCE7] text-[#166534]"
                    : step.status === "next"
                      ? "bg-[#EFF6FF] text-[#2563EB] ring-2 ring-[#BFDBFE]"
                      : "bg-[#F8FAFC] text-[#94A3B8] ring-1 ring-[#E2E8F0]"
                }`}
              >
                {step.status === "completed" ? "✓" : index + 1}
              </span>
              {index < steps.length - 1 && <span className="h-12 w-px bg-[#E2E8F0]" />}
            </div>
            <div className="pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black text-[#0F172A]">{step.title}</p>
                {step.status === "next" && (
                  <span className="rounded-full bg-[#E0F7FA] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#0891B2]">
                    Siguiente paso
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm leading-6 text-[#475569]">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
