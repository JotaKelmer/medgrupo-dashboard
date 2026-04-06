"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilterBar } from "@/components/dashboard/layout/filter-bar";
import { Button } from "@/components/ui/button";
import { useDashboardUI } from "@/contexts/dashboard-ui-context";
import type { SelectOption } from "@/lib/dashboard/types";
import { cn } from "@/lib/dashboard/utils";
import { createClient } from "@/lib/supabase/client";

type DashboardHeaderProps = {
  title: string;
  subtitle: string;
  workspaceOptions: SelectOption[];
  campaignOptions: SelectOption[];
  funnelOptions?: SelectOption[];
  filters: {
    workspaceId: string;
    startDate: string;
    endDate: string;
    product?: string;
    platform: string;
    funnelId?: string;
  };
  includeFunnel?: boolean;
  showBrandLogo?: boolean;
};

const secondaryButtonClassName =
  "border border-white/10 bg-white/5 text-white hover:bg-white/10";

function normalizeBracketToken(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function extractCampaignParts(name: string) {
  const matches = [...name.matchAll(/\[([^\]]+)\]/g)].map((match) =>
    normalizeBracketToken(match[1] ?? ""),
  );

  return {
    product: matches[0] ?? "",
  };
}

export function DashboardHeader(props: DashboardHeaderProps) {
  const router = useRouter();
  const { isFilterVisible, isSidebarVisible, toggleFilters, toggleSidebar } =
    useDashboardUI();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const productOptions = useMemo(() => {
    const seen = new Set<string>();

    return props.campaignOptions
      .map((option) => extractCampaignParts(option.label).product)
      .filter((value) => {
        if (!value || seen.has(value)) return false;
        seen.add(value);
        return true;
      })
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((value) => ({ value, label: value }));
  }, [props.campaignOptions]);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="space-y-4 sm:space-y-5">
      <div className="rounded-3xl border border-white/8 bg-white/3 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:p-5">
        <div
          className={cn(
            "flex flex-col gap-4 xl:flex-row xl:justify-between",
            props.showBrandLogo ? "xl:items-center" : "xl:items-end",
          )}
        >
          <div className="min-w-0">
            {props.showBrandLogo ? (
              <div className="flex min-h-[72px] items-center">
                <Image
                  src="/medgrupo-logo.png"
                  alt="MEDGRUPO"
                  width={50}
                  height={50}
                  priority
                  className="h-auto w-[50px] max-w-full sm:w-[50px] lg:w-[50px]"
                />
              </div>
            ) : (
              <>
                <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                  Dashboard MEDGRUPO
                </p>

                <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                  {props.title}
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/58">
                  {props.subtitle}
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className={secondaryButtonClassName}
              onClick={toggleSidebar}
            >
              {isSidebarVisible ? "Esconder menu" : "Mostrar menu"}
            </Button>

            <Button
              type="button"
              className={secondaryButtonClassName}
              onClick={toggleFilters}
            >
              {isFilterVisible ? "Esconder filtros" : "Mostrar filtros"}
            </Button>

            <Button
              type="button"
              className="border border-white/10 bg-white/5 text-white hover:bg-rose-500/15 hover:text-rose-200"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Saindo..." : "Sair"}
            </Button>
          </div>
        </div>
      </div>

      {isFilterVisible ? (
        <FilterBar
          workspaceOptions={props.workspaceOptions}
          campaignOptions={props.campaignOptions}
          productOptions={productOptions}
          filters={props.filters}
        />
      ) : null}
    </header>
  );
}
