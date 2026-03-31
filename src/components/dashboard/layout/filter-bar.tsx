"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/dashboard/utils";
import type { SelectOption } from "@/lib/dashboard/types";

type FilterBarProps = {
  workspaceOptions: SelectOption[];
  campaignOptions: SelectOption[];
  funnelOptions?: SelectOption[];
  filters: {
    workspaceId: string;
    startDate: string;
    endDate: string;
    campaignId: string;
    platform: string;
    funnelId?: string;
  };
  includeFunnel?: boolean;
};

export function FilterBar({
  workspaceOptions,
  campaignOptions,
  funnelOptions = [],
  filters,
  includeFunnel = false
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState(filters);

  useEffect(() => {
    setState(filters);
  }, [filters]);

  function update(name: string, value: string) {
    setState((current) => ({ ...current, [name]: value }));
  }

  function applyFilters() {
    const params = new URLSearchParams();

    Object.entries(state).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div
      className={cn(
        "grid gap-3 rounded-3xl border border-white/8 bg-white/3 p-4 sm:grid-cols-2 xl:grid-cols-3",
        includeFunnel ? "2xl:grid-cols-6" : "2xl:grid-cols-5"
      )}
    >
      <div className="min-w-0">
        <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/45">
          Conta
        </label>

        <Select
          value={state.workspaceId}
          onChange={(event) => update("workspaceId", event.target.value)}
        >
          {workspaceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="min-w-0">
        <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/45">
          Início
        </label>

        <Input
          type="date"
          value={state.startDate}
          onChange={(event) => update("startDate", event.target.value)}
        />
      </div>

      <div className="min-w-0">
        <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/45">
          Fim
        </label>

        <Input
          type="date"
          value={state.endDate}
          onChange={(event) => update("endDate", event.target.value)}
        />
      </div>

      <div className="min-w-0">
        <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/45">
          Campanha
        </label>

        <Select
          value={state.campaignId}
          onChange={(event) => update("campaignId", event.target.value)}
        >
          <option value="">Todas</option>

          {campaignOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="min-w-0">
        <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/45">
          Plataforma
        </label>

        <Select
          value={state.platform}
          onChange={(event) => update("platform", event.target.value)}
        >
          <option value="all">Consolidado</option>
          <option value="meta">Meta Ads</option>
          <option value="google">Google Ads</option>
        </Select>
      </div>

      {includeFunnel ? (
        <div className="min-w-0">
          <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/45">
            Funil
          </label>

          <Select
            value={state.funnelId ?? ""}
            onChange={(event) => update("funnelId", event.target.value)}
          >
            {funnelOptions.length ? null : <option value="">Funil padrão</option>}

            {funnelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <div className="flex items-end">
        <Button type="button" className="w-full" onClick={applyFilters}>
          Aplicar
        </Button>
      </div>
    </div>
  );
}
