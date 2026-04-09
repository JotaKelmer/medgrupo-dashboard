"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  buildBusinessUnitOptionsFromProductOptions,
  buildCampaignProductOptions,
  getBusinessUnitForProduct,
} from "@/lib/dashboard/constants";
import { cn } from "@/lib/dashboard/utils";
import type { SelectOption } from "@/lib/dashboard/types";

type FilterBarProps = {
  workspaceOptions: SelectOption[];
  campaignOptions: SelectOption[];
  buOptions?: SelectOption[];
  productOptions?: SelectOption[];
  funnelOptions?: SelectOption[];
  filters: {
    workspaceId: string;
    startDate: string;
    endDate: string;
    bu?: string;
    product?: string;
    platform: string;
    funnelId?: string;
  };
  includeFunnel?: boolean;
  includeBusinessUnit?: boolean;
};

type FilterState = {
  workspaceId: string;
  startDate: string;
  endDate: string;
  bu: string;
  product: string;
  platform: string;
};

export function FilterBar({
  workspaceOptions,
  campaignOptions,
  buOptions = [],
  productOptions = [],
  filters,
  includeBusinessUnit = false,
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [state, setState] = useState<FilterState>({
    workspaceId: filters.workspaceId,
    startDate: filters.startDate,
    endDate: filters.endDate,
    bu: filters.bu ?? "",
    product: filters.product ?? "",
    platform: filters.platform,
  });

  useEffect(() => {
    setState({
      workspaceId: filters.workspaceId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      bu: filters.bu ?? "",
      product: filters.product ?? "",
      platform: filters.platform,
    });
  }, [filters]);

  const baseProductOptions = useMemo(() => {
    if (productOptions.length) return productOptions;
    return buildCampaignProductOptions(campaignOptions);
  }, [campaignOptions, productOptions]);

  const visibleBuOptions = useMemo(() => {
    if (!includeBusinessUnit) return [] as SelectOption[];
    if (buOptions.length) return buOptions;
    return buildBusinessUnitOptionsFromProductOptions(baseProductOptions);
  }, [baseProductOptions, buOptions, includeBusinessUnit]);

  const visibleProductOptions = useMemo(() => {
    if (!state.bu) return baseProductOptions;
    return baseProductOptions.filter(
      (option) => getBusinessUnitForProduct(option.value) === state.bu,
    );
  }, [baseProductOptions, state.bu]);

  function update(name: keyof FilterState, value: string) {
    setState((current) => {
      const next = { ...current, [name]: value };

      if (name === "bu") {
        if (
          next.product &&
          value &&
          getBusinessUnitForProduct(next.product) !== value
        ) {
          next.product = "";
        }
      }

      if (name === "product") {
        const productBu = getBusinessUnitForProduct(value);
        if (productBu) {
          next.bu = productBu;
        }
      }

      return next;
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
        "grid gap-3 rounded-3xl border border-white/8 bg-white/3 p-4 sm:grid-cols-2 xl:grid-cols-3",
        includeBusinessUnit ? "2xl:grid-cols-7" : "2xl:grid-cols-6",
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

      {includeBusinessUnit ? (
        <div className="min-w-0">
          <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/45">
            BU
          </label>

          <Select value={state.bu} onChange={(event: any) => update("bu", event.target.value)}>
            <option value="">Todas as BUs</option>

            {visibleBuOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

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
