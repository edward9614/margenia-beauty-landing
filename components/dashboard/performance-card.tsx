export function PerformanceCard() {
  return (
    <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-[#0F172A]">Rendimiento del negocio</h2>
          <p className="mt-2 text-sm text-[#475569]">
            Aquí verás la evolución cuando registres tus primeras operaciones.
          </p>
        </div>
        <div className="grid w-fit grid-cols-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] p-1">
          <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#2563EB] shadow-sm">
            Ventas
          </span>
          <span className="px-4 py-2 text-sm font-black text-[#475569]">Utilidad</span>
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-5">
        <div className="flex h-48 items-end gap-3">
          {[28, 46, 34, 62, 48, 72, 58, 82].map((height, index) => (
            <span
              key={`${height}-${index}`}
              className="flex-1 rounded-t-xl bg-[#E2E8F0]"
              style={{ height: `${height}%` }}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="mt-5 text-center">
          <h3 className="text-lg font-black text-[#0F172A]">Aún no hay suficientes datos</h3>
          <p className="mt-2 text-sm leading-6 text-[#475569]">
            Registra tus primeras ventas para visualizar la evolución de tu negocio.
          </p>
        </div>
      </div>
    </section>
  );
}
