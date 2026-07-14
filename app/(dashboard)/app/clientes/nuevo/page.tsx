import Link from "next/link";
import { CustomerForm } from "@/components/customers/customer-form";

export default function NewCustomerPage() {
  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <Link href="/app/clientes" className="text-sm font-black text-[#2563EB]">← Volver a clientes</Link>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-[#2563EB]">Nuevo perfil</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0F172A] dark:text-white sm:text-4xl">Crear cliente</h1>
          <p className="mt-3 text-sm font-bold text-[#64748B]">Empieza con lo esencial. Podrás enriquecer la ficha con compras y notas después.</p>
        </header>
        <CustomerForm />
      </div>
    </main>
  );
}
