import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerForm } from "@/components/customers/customer-form";
import { customerFormFromRow, type CustomerRow } from "@/lib/customers";
import { createClient } from "@/lib/supabase/server";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: business } = await supabase.from("businesses").select("id").eq("owner_id", user.id).limit(1).maybeSingle();
  if (!business) redirect("/app/onboarding");
  const { data: customer } = await supabase.from("customers").select("id,business_id,full_name,document_type,document_number,phone,email,birth_date,gender,address,city,preferred_contact_channel,marketing_opt_in,tags,notes_summary,status,archived_at,created_at,updated_at").eq("id", id).eq("business_id", business.id).maybeSingle();
  if (!customer) notFound();

  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <Link href={`/app/clientes/${id}`} className="text-sm font-black text-[#2563EB]">← Volver al perfil</Link>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-[#2563EB]">Editar cliente</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0F172A] dark:text-white sm:text-4xl">{customer.full_name}</h1>
        </header>
        <CustomerForm customerId={id} initialValue={customerFormFromRow(customer as CustomerRow)} />
      </div>
    </main>
  );
}
