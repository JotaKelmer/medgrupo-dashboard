"use client";

import type { ReactNode } from "react";
import { DashboardUIProvider } from "@/contexts/dashboard-ui-context";
import { Sidebar } from "@/components/dashboard/layout/sidebar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <DashboardUIProvider>
      <div className="min-h-screen bg-transparent">
        <div className="mx-auto flex min-h-screen w-full max-w-[1920px]">
          <Sidebar />

          <main className="min-w-0 flex-1 px-4 py-4 sm:px-5 lg:px-8 lg:py-6 min-[1800px]:px-10">
            <div className="mx-auto w-full max-w-[1560px] min-w-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DashboardUIProvider>
  );
}
