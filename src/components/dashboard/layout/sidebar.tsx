"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/dashboard/utils";
import { useDashboardUI } from "@/contexts/dashboard-ui-context";

const items = [
  { href: "/dashboard/geral", label: "Geral", icon: "◧" },
  { href: "/dashboard/verba", label: "Verba", icon: "◎" },
  { href: "/dashboard/controle", label: "Controle", icon: "⚙" }
];

export function Sidebar() {
  const pathname = usePathname();
  const { closeSidebar, isMobile, isSidebarVisible } = useDashboardUI();

  return (
    <>
      {isMobile && isSidebarVisible ? (
        <button
          type="button"
          aria-label="Fechar menu lateral"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "z-50 flex h-screen flex-col gap-6 overflow-y-auto border-r border-white/6 bg-[var(--sidebar)]/95 px-5 py-5 shadow-2xl backdrop-blur-xl transition-transform duration-300",
          isMobile
            ? "fixed inset-y-0 left-0 w-[86vw] max-w-[320px]"
            : "sticky top-0 hidden w-[280px] shrink-0 lg:flex",
          isMobile && isSidebarVisible ? "translate-x-0" : "",
          isMobile && !isSidebarVisible ? "-translate-x-full" : "",
          !isMobile && !isSidebarVisible ? "lg:hidden" : ""
        )}
      >
        <div className="flex items-start justify-between gap-3 rounded-3xl border border-white/6 bg-white/4 px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/45">
              MEDGRUPO
            </p>
            <h1 className="mt-2 text-xl font-semibold text-white">
              Mídia &amp; Performance
            </h1>
          </div>

          {isMobile ? (
            <button
              type="button"
              onClick={closeSidebar}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg text-white/70"
            >
              ×
            </button>
          ) : null}
        </div>

        <nav className="space-y-2">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  active
                    ? "bg-[var(--color-lime)]/10 text-[var(--color-lime)]"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                )}
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/4 text-base">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-3xl border border-white/6 bg-white/4 p-4">
          <p className="text-sm font-medium text-white">Modo dashboard</p>
          <p className="mt-1 text-sm leading-6 text-white/55">
            Layout premium escuro com leitura executiva, análise e planejamento.
          </p>
        </div>
      </aside>
    </>
  );
}
