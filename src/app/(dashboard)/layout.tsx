import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

type DashboardLayoutProps = {
  children: any;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}