import { redirect } from "next/navigation";
import { CashMovementForm } from "@/components/cash-register/cash-movement-form";
import { DashboardShell } from "@/components/ui/dashboard-primitives";
import { createClient } from "@/lib/supabase/server";

export default async function CashMovementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!business) {
    redirect("/app/onboarding");
  }

  const { data: openSession } = await supabase
    .from("cash_sessions")
    .select("id")
    .eq("business_id", business.id)
    .eq("status", "open")
    .limit(1)
    .maybeSingle();

  if (!openSession) {
    redirect("/app/caja");
  }

  return (
    <main className="w-full px-3 py-3 sm:px-5 sm:py-5 lg:px-7 xl:px-9">
      <DashboardShell className="p-4 sm:p-6 lg:p-8">
        <CashMovementForm />
      </DashboardShell>
    </main>
  );
}
