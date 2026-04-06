"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/dashboard/utils";
import type { SelectOption } from "@/lib/dashboard/types";

type FilterBarProps = {
  workspaceOptions: SelectOption[];
  campaignOptions: SelectOption[];
  productOptions?: SelectOption[];
  campaignGroupOptions?: SelectOption[];
  funnelOptions?: SelectOption[];
  filters: {
    workspaceId: string;
    startDate: string;
    endDate: string;
    campaignId: string;
    product?: string;
    campaignGroup?: string;
    platform: string;
    funnelId?: string;
  };
  includeFunnel?: boolean;
};

type FilterState = {
  workspaceId: string;
  startDate: string;
  endDate: string;
  campaignId: string;
  product: string;
  campaignGroup: string;
  platform: string;
};

function normalizeBracketToken(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function extractCampaignParts(name: string) {
  const matches = [...name.matchAll(/\[([^\]]+)\]/g)].map((match) =>
    normalizeBracketToken(match[1] ?? ""),
  );

  return {
    product: matches[0] ?? "",
    campaignGroup: matches[1] ?? "",
  };
}

export function FilterBar({
  workspaceOptions,
  campaignOptions,
  productOptions = [],
  campaignGroupOptions = [],
  filters,
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [state, setState] = useState<FilterState>({
    workspaceId: filters.workspaceId,
    startDate: filters.startDate,
    endDate: filters.endDate,
    campaignId: filters.campaignId,
    product: filters.product ?? "",
    campaignGroup: filters.campaignGroup ?? "",
    platform: filters.platform,
  });

  useEffect(() => {
    setState({
      workspaceId: filters.workspaceId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      campaignId: filters.campaignId,
      product: filters.product ?? "",
      campaignGroup: filters.campaignGroup ?? "",
      platform: filters.platform,
    });
  }, [filters]);

  const fallbackProductOptions = useMemo(() => {
    const seen = new Set<string>();

    return campaignOptions
      .map((option) => extractCampaignParts(option.label).product)
      .filter((value) => {
        if (!value || seen.has(value)) return false;
        seen.add(value);
        return true;
      })
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((value) => ({ value, label: value }));
  }, [campaignOptions]);

  const visibleProductOptions = productOptions.length ? productOptions : fallbackProductOptions;

  const fallbackCampaignGroupOptions = useMemo(() => {
    const seen = new Set<string>();

    return campaignOptions
      .filter((option) => {
        if (!state.product) return true;
        return extractCampaignParts(option.label).product === state.product;
      })
      .map((option) => extractCampaignParts(option.label).campaignGroup)
      .filter((value) => {
        if (!value || seen.has(value)) return false;
        seen.add(value);
        return true;
      })
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((value) => ({ value, label: value }));
  }, [campaignOptions, state.product]);

  const visibleCampaignGroupOptions = campaignGroupOptions.length
    ? campaignGroupOptions
    : fallbackCampaignGroupOptions;

  function update(name: keyof FilterState, value: string) {
    setState((current) => {
      if (name === "product") {
        return {
          ...current,
          product: value,
          campaignGroup: "",
          campaignId: "",
        };
      }

      if (name === "campaignGroup") {
        return {
          ...current,
          campaignGroup: value,
          campaignId: "",
        };
      }

      return { ...current, [name]: value };
    });
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
        "grid gap-3 rounded-3xl border border-white/8 bg-white/3 p-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7",
      )}
    >
      <div className="min-w-0">
        <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/45">
          Conta
        </label>

        <Select
          value={state.workspaceId}
          onChange={(event: any) => update("workspaceId", event.target.value)}
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
          onChange={(event: any) => update("startDate", event.target.value)}
        />
      </div>

      <div className="min-w-0">
        <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/45">
          Fim
        </label>

        <Input
          type="date"
          value={state.endDate}
          onChange={(event: any) => update("endDate", event.target.value)}
        />
      </div>

      <div className="min-w-0">
        <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/45">
          Produto
        </label>

        <Select
          value={state.product}
          onChange={(event: any) => update("product", event.target.value)}
        >
          <option value="">Todos os produtos</option>

          {visibleProductOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="min-w-0">
        <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/45">
          Campanha
        </label>

        <Select
          value={state.campaignGroup}
          onChange={(event: any) => update("campaignGroup", event.target.value)}
        >
          <option value="">Todas as campanhas</option>

          {visibleCampaignGroupOptions.map((option) => (
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
          onChange={(event: any) => update("platform", event.target.value)}
        >
          <option value="all">Consolidado</option>
          <option value="meta">Meta Ads</option>
          <option value="google">Google Ads</option>
        </Select>
      </div>

      <div className="flex items-end">
        <Button type="button" className="w-full" onClick={applyFilters}>
          Aplicar
        </Button>
      </div>
    </div>
  );
}
