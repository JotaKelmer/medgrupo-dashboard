import type { Metadata } from "next";
import { Sidebar } from "@/components/dashboard/layout/sidebar";
import { DashboardUIProvider } from "@/contexts/dashboard-ui-context";

export const metadata: Metadata = {
  title: "Medgrupo Dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardUIProvider>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(217,234,12,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_30%),linear-gradient(180deg,#0b0d14_0%,#0f1118_100%)] text-white">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </DashboardUIProvider>
  );
}