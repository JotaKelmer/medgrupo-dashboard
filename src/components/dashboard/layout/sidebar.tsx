"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboardUI } from "@/contexts/dashboard-ui-context";
import { cn } from "@/lib/dashboard/utils";
import { useAuthz } from "@/contexts/authz-context";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  external?: boolean;
  disabled?: boolean;
};

export function Sidebar() {
  const pathname = usePathname();
  const { closeSidebar, isMobile, isSidebarVisible } = useDashboardUI();
  const { permissions, role } = useAuthz();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isAdmin = role === "owner" || role === "admin";

  const primaryItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [];

    if (permissions.plano_midia?.canView) {
      items.push({
        href: "/dashboard/midia",
        label: "Planejamento",
        icon: "▦",
      });
    }

    if (permissions.inteligencia_operacional?.canView) {
      items.push({
        href: "/dashboard/inteligencia-operacional",
        label: "Operações",
        icon: "◫",
      });
    }

    if (permissions.geral?.canView) {
      items.push({
        href: "/dashboard/geral",
        label: "Performance",
        icon: "◧",
      });
    }

    if (permissions.excelencia_comercial?.canView) {
      items.push({
        href: "https://mdg.revlabs.com.br/",
        label: "Comercial",
        icon: "↗",
        external: true,
      });
    }

    items.push({
      href: "#",
      label: "Execução",
      icon: "◜",
      disabled: true,
    });

    return items;
  }, [permissions]);

  const settingsItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [];

    if (permissions.verbas?.canView) {
      items.push({ href: "/dashboard/verba", label: "Verba", icon: "◎" });
    }

    if (isAdmin) {
      items.push({
        href: "/dashboard/usuarios",
        label: "Usuários",
        icon: "👤",
      });
    }

    return items;
  }, [permissions, isAdmin]);

  const hasSettingsItems = settingsItems.length > 0;

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
            const active =
              !item.external && !item.disabled && pathname.startsWith(item.href);

            if (item.disabled) {
              return (
                <div
                  key={`${item.label}-${item.href}`}
                  className="flex cursor-not-allowed items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-white/35"
                  aria-disabled="true"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/6 bg-white/3 text-base">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
              );
            }

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
          {hasSettingsItems && settingsOpen ? (
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

          {hasSettingsItems ? (
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
          ) : null}
        </div>
      </aside>
    </>
  );
}