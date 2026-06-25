const actions = [
  {
    title: "Agregar producto",
    text: "Registra costos, precios y existencias.",
  },
  {
    title: "Crear combo",
    text: "Arma kits y promociones rentables.",
  },
  {
    title: "Registrar venta",
    text: "Conecta ingresos con utilidad real.",
  },
  {
    title: "Registrar movimiento",
    text: "Controla entradas y salidas de caja.",
  },
];

export function QuickActions() {
  return (
    <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0F172A]">Acciones rápidas</h2>
          <p className="mt-2 text-sm text-[#475569]">
            Estas serán tus acciones principales cuando activemos los módulos.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action.title}
            type="button"
            disabled
            className="rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-85"
          >
            <span className="inline-flex rounded-full bg-[#E0F7FA] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#0891B2]">
              Próximamente
            </span>
            <p className="mt-3 text-base font-black text-[#0F172A]">{action.title}</p>
            <p className="mt-1 text-sm leading-6 text-[#475569]">{action.text}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
