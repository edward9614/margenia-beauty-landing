import { redirect } from "next/navigation";
import { CloseCashForm } from "@/components/cash-register/close-cash-form";
import { DashboardShell } from "@/components/ui/dashboard-primitives";
import type { CashMovementRow, CashSalePaymentRow, CashSessionRow } from "@/lib/cash-register";
import { createClient } from "@/lib/supabase/server";

export default async function CloseCashPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id,currency")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!business) {
    redirect("/app/onboarding");
  }

  const { data: openSession } = await supabase
    .from("cash_sessions")
    .select("*")
    .eq("business_id", business.id)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!openSession) {
    redirect("/app/caja");
  }

  const session = openSession as CashSessionRow;
  const [{ data: movementRows }, { data: paymentRows }] = await Promise.all([
    supabase
      .from("cash_movements")
      .select("*")
      .eq("business_id", business.id)
      .eq("session_id", session.id)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("sale_payments")
      .select("id,amount,payment_method,paid_at,reference,sales!inner(id,sale_code,status)")
      .eq("business_id", business.id)
      .eq("sales.status", "completed")
      .gte("paid_at", session.opened_at)
      .lte("paid_at", new Date().toISOString())
      .order("paid_at", { ascending: false }),
  ]);

  return (
    <main className="w-full px-3 py-3 sm:px-5 sm:py-5 lg:px-7 xl:px-9">
      <DashboardShell className="p-4 sm:p-6 lg:p-8">
        <CloseCashForm
          currency={business.currency || "COP"}
          movements={(movementRows || []) as CashMovementRow[]}
          payments={(paymentRows || []) as unknown as CashSalePaymentRow[]}
          session={session}
        />
      </DashboardShell>
    </main>
  );
}
