import { redirect } from "next/navigation";
import { MobileNavigation, SidebarNavigation } from "@/components/app-shell/app-navigation";
import { PrivateHeader } from "@/components/app-shell/private-header";
import { createClient } from "@/lib/supabase/server";

export default async function PrivateAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] text-[#0F172A]">
      <div className="flex min-h-screen w-full">
        <SidebarNavigation businessName={business?.name} userEmail={user.email} />
        <div className="min-w-0 flex-1 bg-[#F8FAFC] pb-24 lg:pb-0">
          <PrivateHeader businessName={business?.name} email={user.email} />
          {children}
        </div>
      </div>
      <MobileNavigation />
    </div>
  );
}
