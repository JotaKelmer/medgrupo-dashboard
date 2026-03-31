"use client";

import { useMemo, useState } from "react";
import { buildBudgetEstimates, normalizeChannels, normalizeObjectives } from "@/lib/dashboard/calculations";
import type {
  BenchmarkValues,
  BudgetComparisonRow,
  BudgetPlannerState,
  ObjectiveDistributionState,
  PlatformType
} from "@/lib/dashboard/types";
import { formatCompact, formatCurrency } from "@/lib/dashboard/utils";
import { PLATFORM_LABELS } from "@/lib/dashboard/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type BudgetPlannerPanelProps = {
  initialState: BudgetPlannerState;
  comparison: BudgetComparisonRow[];
};

function rehydratePlan(state: BudgetPlannerState) {
  const channels = normalizeChannels(state.totalBudget, state.channels);
  const objectives = normalizeObjectives(state.periodDays, channels, state.objectives);
  const estimates = buildBudgetEstimates({
    totalBudget: state.totalBudget,
    periodDays: state.periodDays,
    channels,
    benchmarks: state.benchmarks
  });

  return {
    ...state,
    channels,
    objectives,
    estimates
  };
}

function updateBenchmark(
  benchmarks: Record<PlatformType, BenchmarkValues>,
  platform: PlatformType,
  key: keyof BenchmarkValues,
  value: number
) {
  return {
    ...benchmarks,
    [platform]: {
      ...benchmarks[platform],
      [key]: value
    }
  };
}

export function BudgetPlannerPanel({ initialState, comparison }: BudgetPlannerPanelProps) {
  const [state, setState] = useState<BudgetPlannerState>(() => rehydratePlan(initialState));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");

  const comparisonMap = useMemo(
    () => new Map(comparison.map((item) => [item.platform, item])),
    [comparison]
  );

  function applyPatch(patch: Partial<BudgetPlannerState>) {
    setState((current) => rehydratePlan({ ...current, ...patch }));
  }

  function updateChannel(platform: PlatformType, percentage: number) {
    applyPatch({
      channels: state.channels.map((channel) =>
        channel.platform === platform ? { ...channel, percentage } : channel
      )
    });
  }

  function updateObjective(id: string, percentage: number) {
    applyPatch({
      objectives: state.objectives.map((objective) =>
        objective.id === id ? { ...objective, percentage } : objective
      )
    });
  }

  function updateBenchmarks(platform: PlatformType, key: keyof BenchmarkValues, value: number) {
    applyPatch({
      benchmarks: updateBenchmark(state.benchmarks, platform, key, value)
    });
  }

  async function savePlan() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/budget-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(state)
      });

      if (!response.ok) {
        throw new Error("Não foi possível salvar o plano.");
      }

      const payload = await response.json();
      setState((current) => ({ ...current, id: payload.id ?? current.id }));
      setMessage("Plano salvo com sucesso.");
    } catch (error) {
      console.error(error);
      setMessage("Falha ao salvar no banco. Verifique a configuração do Supabase.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">Entrada de orçamento</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Defina verba, período e pesos por canal</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/45">
                Nome do plano
              </label>
              <Input
                value={state.name}
                onChange={(event) => applyPatch({ name: event.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/45">
                Orçamento total
              </label>
              <Input
                type="number"
                value={state.totalBudget}
                onChange={(event) => applyPatch({ totalBudget: Number(event.target.value || 0) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/45">
                Período (dias)
              </label>
              <Input
                type="number"
                min={1}
                value={state.periodDays}
                onChange={(event) => applyPatch({ periodDays: Number(event.target.value || 1) })}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {state.channels.map((channel) => (
              <div key={channel.platform} className="rounded-3xl border border-white/8 bg-white/4 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{PLATFORM_LABELS[channel.platform]}</p>
                    <p className="text-xs text-white/45">Distribuição do orçamento total</p>
                  </div>
                  <p className="text-lg font-semibold text-[var(--color-lime)]">
                    {formatCurrency(channel.amount)}
                  </p>
                </div>
                <div className="mt-4">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={channel.percentage}
                    onChange={(event) =>
                      updateChannel(channel.platform, Number(event.target.value || 0))
                    }
                  />
                  <p className="mt-2 text-xs text-white/45">{channel.percentage}% do plano</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={savePlan} disabled={saving}>
              {saving ? "Salvando..." : "Salvar plano"}
            </Button>
            {message ? <span className="text-sm text-white/60">{message}</span> : null}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">Benchmarks</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Premissas por plataforma</h2>
          </div>

          {(["meta", "google"] as PlatformType[]).map((platform) => (
            <div key={platform} className="rounded-3xl border border-white/8 bg-white/4 p-4">
              <p className="mb-3 text-sm font-semibold text-white">{PLATFORM_LABELS[platform]}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-white/45">CPM</label>
                  <Input
                    type="number"
                    value={state.benchmarks[platform].cpm}
                    onChange={(event) =>
                      updateBenchmarks(platform, "cpm", Number(event.target.value || 0))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-white/45">
                    Custo / Visita
                  </label>
                  <Input
                    type="number"
                    value={state.benchmarks[platform].costPerVisit}
                    onChange={(event) =>
                      updateBenchmarks(platform, "costPerVisit", Number(event.target.value || 0))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-white/45">
                    Custo / Engajamento
                  </label>
                  <Input
                    type="number"
                    value={state.benchmarks[platform].costPerEngagement}
                    onChange={(event) =>
                      updateBenchmarks(platform, "costPerEngagement", Number(event.target.value || 0))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-white/45">
                    Custo / Lead
                  </label>
                  <Input
                    type="number"
                    value={state.benchmarks[platform].costPerLead}
                    onChange={(event) =>
                      updateBenchmarks(platform, "costPerLead", Number(event.target.value || 0))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-white/45">
                    Custo / Venda
                  </label>
                  <Input
                    type="number"
                    value={state.benchmarks[platform].costPerSale}
                    onChange={(event) =>
                      updateBenchmarks(platform, "costPerSale", Number(event.target.value || 0))
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div className="grid gap-5 2xl:grid-cols-2">
        {(["meta", "google"] as PlatformType[]).map((platform) => {
          const platformObjectives = state.objectives.filter((item) => item.platform === platform);
          const platformEstimates = state.estimates[platform];
          const channel = state.channels.find((item) => item.platform === platform);
          const realized = comparisonMap.get(platform);
          const plannedLeadMetric = platformEstimates.find((metric) => metric.metricKey === "leads");

          return (
            <Card key={platform} className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">Planejamento</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{PLATFORM_LABELS[platform]}</h2>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/45">Verba do canal</p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--color-lime)]">
                    {formatCurrency(channel?.amount ?? 0)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {platformObjectives.map((objective) => (
                  <ObjectiveRow
                    key={objective.id}
                    objective={objective}
                    onChange={(value) => updateObjective(objective.id, value)}
                  />
                ))}
              </div>

              <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
                <p className="text-sm font-semibold text-white">Estimativas do canal</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {platformEstimates.map((metric) => (
                    <div key={metric.metricKey} className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-white/45">{metric.metricLabel}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{formatCompact(metric.totalResult)}</p>
                      <p className="text-xs text-white/45">diário: {formatCompact(metric.dailyResult)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
                <p className="text-sm font-semibold text-white">Planejado vs realizado</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <MetricChip label="Planejado" value={formatCurrency(channel?.amount ?? 0)} />
                  <MetricChip label="Realizado" value={formatCurrency(realized?.realizedBudget ?? 0)} />
                  <MetricChip label="Leads previstos" value={formatCompact(plannedLeadMetric?.totalResult ?? 0)} />
                  <MetricChip label="Resultados reais" value={formatCompact(realized?.realizedResults ?? 0)} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ObjectiveRow({
  objective,
  onChange
}: {
  objective: ObjectiveDistributionState;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-white/8 bg-white/4 p-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(160px,0.7fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)]">
      <div>
        <p className="text-sm font-medium text-white">{objective.objective}</p>
        <p className="text-xs text-white/45">Distribuição dentro do canal</p>
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/45">%</label>
        <Input type="number" min={0} max={100} value={objective.percentage} onChange={(event) => onChange(Number(event.target.value || 0))} />
      </div>
      <MetricChip label="Diário" value={formatCurrency(objective.dailyBudget)} />
      <MetricChip label="Total" value={formatCurrency(objective.totalBudget)} />
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.12em] text-white/45">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
