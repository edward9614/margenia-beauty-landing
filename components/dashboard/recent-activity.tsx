import { EmptyActivityIcon } from "@/components/dashboard/dashboard-icons";

export function RecentActivity() {
  return (
    <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-5 text-center shadow-sm sm:p-6">
      <h2 className="text-left text-xl font-black text-[#0F172A]">Actividad reciente</h2>
      <div className="py-8">
        <EmptyActivityIcon />
        <h3 className="mt-5 text-lg font-black text-[#0F172A]">
          Tu actividad aparecerá aquí
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#475569]">
          Cuando agregues productos, registres ventas o realices movimientos, podrás
          consultarlos desde este espacio.
        </p>
      </div>
    </section>
  );
}
