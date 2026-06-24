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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <SidebarNavigation />
        <div className="min-w-0 flex-1 pb-24 lg:pb-0">
          <PrivateHeader email={user.email} />
          {children}
        </div>
      </div>
      <MobileNavigation />
    </div>
  );
}
