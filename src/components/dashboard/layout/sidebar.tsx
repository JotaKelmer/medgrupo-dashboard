"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboardUI } from "@/contexts/dashboard-ui-context";
import { cn } from "@/lib/dashboard/utils";

const primaryItems = [
  { href: "/dashboard/geral", label: "Geral", icon: "◧" },
  {
    href: "/dashboard/inteligencia-operacional",
    label: "Inteligência Operacional",
    icon: "◫",
  },
  {
    href: "https://mdg.revlabs.com.br/",
    label: "Excelência Comercial",
    icon: "↗",
    external: true,
  },
];

const settingsItems = [
  { href: "/dashboard/verba", label: "Verba", icon: "◎" },
  { href: "/dashboard/controle", label: "Controle", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { closeSidebar, isMobile, isSidebarVisible } = useDashboardUI();
  const [settingsOpen, setSettingsOpen] = useState(false);

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
          "z-50 flex h-screen flex-col overflow-y-auto border-r border-white/6 bg-[var(--sidebar)]/95 px-5 py-5 shadow-2xl backdrop-blur-xl transition-transform duration-300",
          isMobile
            ? "fixed inset-y-0 left-0 w-[86vw] max-w-[320px]"
            : "sticky top-0 hidden w-[280px] shrink-0 lg:flex",
          isMobile && isSidebarVisible ? "translate-x-0" : "",
          isMobile && !isSidebarVisible ? "-translate-x-full" : "",
          !isMobile && !isSidebarVisible ? "lg:hidden" : "",
        )}
      >
        <div className="flex items-start justify-between gap-3 rounded-3xl border border-white/6 bg-white/4 px-4 py-4">
          <div>
            <div className="relative h-8 w-40">
              <Image
                src="/brands/medgrupo-logo.png"
                alt="Logo Medgrupo"
                fill
                sizes="160px"
                className="object-contain object-left"
                priority
              />
            </div>

            <h1 className="mt-3 text-xl font-semibold text-white">
              Mídia &amp; Performance
            </h1>
          </div>
        </div>

        <nav className="mt-6 space-y-2">
          {primaryItems.map((item) => {
            const active = !item.external && pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                {...(item.external
                  ? { target: "_blank", rel: "noreferrer" }
                  : {})}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  active
                    ? "bg-[var(--color-lime)]/10 text-[var(--color-lime)]"
                    : "text-white/65 hover:bg-white/5 hover:text-white",
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

        <div className="mt-auto pt-6">
          {settingsOpen ? (
            <div className="mb-3 space-y-2 rounded-3xl border border-white/6 bg-white/3 p-3">
              {settingsItems.map((item) => {
                const active = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      setSettingsOpen(false);
                      closeSidebar();
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                      active
                        ? "bg-[var(--color-lime)]/10 text-[var(--color-lime)]"
                        : "text-white/65 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/4 text-base">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setSettingsOpen((current) => !current)}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
              settingsOpen
                ? "bg-white/7 text-white"
                : "text-white/65 hover:bg-white/5 hover:text-white",
            )}
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/4 text-base">
              ⚙
            </span>
            <span>Configurações</span>
          </button>
        </div>
      </aside>
    </>
  );
}
