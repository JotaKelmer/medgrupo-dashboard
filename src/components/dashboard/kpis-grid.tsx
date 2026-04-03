"use client";

import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import type { DashboardMediaBenchmarks, KpiMetrics } from "@/lib/dashboard/types";
import {
  cn,
  formatCompact,
  formatCurrency,
  formatMultiplier,
  formatPercent,
} from "@/lib/dashboard/utils";
import type { Ga4DashboardResponse } from "@/types/ga4-dashboard";

type Props = {
  kpis: KpiMetrics;
  mediaBenchmarks: DashboardMediaBenchmarks;
  startDate: string;
  endDate: string;
  hideAnalytics?: boolean;
};

type Ga4State = {
  loading: boolean;
  data: Ga4DashboardResponse | null;
  error: string | null;
};

type MetricCard = {
  label: string;
  value: string;
  caption: string;
  notes?: string[];
  tone?: "default" | "analytics";
};

const emptyGa4State: Ga4State = {
  loading: false,
  data: null,
  error: null,
};

function buildRequestUrl(startDate: string, endDate: string) {
  const params = new URLSearchParams({
    startDate,
    endDate,
    historyCycles: "6",
  });

  return `/api/analytics/ga4?${params.toString()}`;
}

function hasRelevantValue(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) > 0.0001;
}

function formatPlatformMetric(
  label: string,
  value: number | null | undefined,
  formatter: (value: number) => string,
) {
  if (!hasRelevantValue(value)) return null;
  return `${label} ${formatter(value)}`;
}

function getPlatformCpm(benchmark: DashboardMediaBenchmarks["googleAds"]) {
  return benchmark.current.impressions > 0
    ? (benchmark.current.spend / benchmark.current.impressions) * 1000
    : 0;
}

function getPlatformCpc(benchmark: DashboardMediaBenchmarks["googleAds"]) {
  return benchmark.current.clicks > 0
    ? benchmark.current.spend / benchmark.current.clicks
    : 0;
}

function useGa4Visitors(startDate: string, endDate: string, enabled: boolean) {
  const [state, setState] = useState<Ga4State>(
    enabled ? { loading: true, data: null, error: null } : emptyGa4State,
  );

  useEffect(() => {
    if (!enabled) {
      setState(emptyGa4State);
      return;
    }

    const controller = new AbortController();

    async function load() {
      setState({ loading: true, data: null, error: null });

      try {
        const response = await fetch(buildRequestUrl(startDate, endDate), {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const payload = (await response.json()) as
          | Ga4DashboardResponse
          | { ok: false; error?: string };

        if (!response.ok || ("ok" in payload && payload.ok === false)) {
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : "Não foi possível carregar o GA4.",
          );
        }

        setState({
          loading: false,
          data: payload as Ga4DashboardResponse,
          error: null,
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        setState({
          loading: false,
          data: null,
          error:
            error instanceof Error
              ? error.message
              : "Erro desconhecido ao carregar o GA4.",
        });
      }
    }

    void load();

    return () => controller.abort();
  }, [enabled, endDate, startDate]);

  return state;
}

function KpiCard({ card }: { card: MetricCard }) {
  return (
    <Card
      className={cn(
        "min-h-[138px] rounded-[30px] border-2 border-white/12 bg-white/[0.03] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.16)]",
        card.tone === "analytics" &&
          "bg-[linear-gradient(180deg,rgba(72,150,150,0.12),rgba(255,255,255,0.03))]",
      )}
    >
      <div className="flex h-full flex-col justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white/88">{card.label}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/40">
            {card.caption}
          </p>
        </div>

        <div>
          <p className="text-3xl font-semibold text-white">{card.value}</p>

          {card.notes?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {card.notes.map((note) => (
                <span
                  key={note}
                  className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-white/58"
                >
                  {note}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function KpiGrid({
  kpis,
  mediaBenchmarks,
  startDate,
  endDate,
  hideAnalytics = false,
}: Props) {
  const ga4 = useGa4Visitors(startDate, endDate, !hideAnalytics);

  const googleCurrent = mediaBenchmarks.googleAds.current;
  const metaCurrent = mediaBenchmarks.metaAds.current;

  const rowOne = useMemo<MetricCard[]>(() => {
    const cards: MetricCard[] = [
      {
        label: "Impressões",
        value: formatCompact(kpis.impressions),
        caption: "Google Ads + Meta Ads",
        notes: [
          formatPlatformMetric("Google", googleCurrent.impressions, formatCompact),
          formatPlatformMetric("Meta", metaCurrent.impressions, formatCompact),
        ].filter(Boolean) as string[],
      },
      {
        label: "CPM",
        value: formatCurrency(kpis.cpm),
        caption: "Consolidado da mídia",
        notes: [
          formatPlatformMetric("Google", getPlatformCpm(mediaBenchmarks.googleAds), formatCurrency),
          formatPlatformMetric("Meta", getPlatformCpm(mediaBenchmarks.metaAds), formatCurrency),
        ].filter(Boolean) as string[],
      },
    ];

    if (!hideAnalytics) {
      cards.push({
        label: "Visitantes GA4",
        value: ga4.loading
          ? "Carregando..."
          : ga4.data
            ? formatCompact(ga4.data.siteConversion.siteVisitors)
            : "Indisponível",
        caption: "Google Analytics",
        tone: "analytics",
        notes: ga4.data
          ? [
              `Sessões ${ga4.data.heroCards.visits.formattedValue}`,
              `Inscrições ${ga4.data.heroCards.signups.formattedValue}`,
            ]
          : ga4.error
            ? ["Dados indisponíveis no momento"]
            : ["Aguardando retorno do GA4"],
      });
    }

    return cards;
  }, [
    ga4.data,
    ga4.error,
    ga4.loading,
    googleCurrent.impressions,
    hideAnalytics,
    kpis.cpm,
    kpis.impressions,
    mediaBenchmarks.googleAds,
    mediaBenchmarks.metaAds,
    metaCurrent.impressions,
  ]);

  const rowTwo = useMemo<MetricCard[]>(
    () => [
      {
        label: "Cliques",
        value: formatCompact(kpis.clicks),
        caption: "Consolidado da mídia",
        notes: [
          formatPlatformMetric("Google", googleCurrent.clicks, formatCompact),
          formatPlatformMetric("Meta", metaCurrent.clicks, formatCompact),
        ].filter(Boolean) as string[],
      },
      {
        label: "CTR",
        value: formatPercent(kpis.ctr),
        caption: "Taxa de clique",
        notes: [
          formatPlatformMetric("Google", googleCurrent.ctr, formatPercent),
          formatPlatformMetric("Meta", metaCurrent.ctr, formatPercent),
        ].filter(Boolean) as string[],
      },
      {
        label: "CPC",
        value: formatCurrency(kpis.cpc),
        caption: "Custo por clique",
        notes: [
          formatPlatformMetric("Google", getPlatformCpc(mediaBenchmarks.googleAds), formatCurrency),
          formatPlatformMetric("Meta", getPlatformCpc(mediaBenchmarks.metaAds), formatCurrency),
        ].filter(Boolean) as string[],
      },
    ],
    [
      googleCurrent.clicks,
      googleCurrent.ctr,
      kpis.clicks,
      kpis.cpc,
      kpis.ctr,
      mediaBenchmarks.googleAds,
      mediaBenchmarks.metaAds,
      metaCurrent.clicks,
      metaCurrent.ctr,
    ],
  );

  const rowThree = useMemo<MetricCard[]>(
    () => [
      {
        label: "Inscritos",
        value: formatCompact(kpis.leads),
        caption: "Cadastros do período",
        notes: [`Cliques no link ${formatCompact(kpis.linkClicks)}`],
      },
      {
        label: "Conversas",
        value: formatCompact(kpis.messagesStarted),
        caption: "Mensagens iniciadas",
        notes: kpis.messagesStarted > 0 ? ["Meta Ads"] : ["Sem conversas no período"],
      },
      {
        label: "Tx Conversão",
        value: formatPercent(kpis.conversionRate),
        caption: "Aquisição por clique",
        notes: [
          formatPlatformMetric(
            "Google",
            mediaBenchmarks.googleAds.current.conversionRate,
            formatPercent,
          ),
          formatPlatformMetric(
            "Meta",
            mediaBenchmarks.metaAds.current.conversionRate,
            formatPercent,
          ),
        ].filter(Boolean) as string[],
      },
      {
        label: "CPA",
        value: formatCurrency(kpis.cpa),
        caption: "Custo por aquisição",
        notes: [
          formatPlatformMetric("Google", mediaBenchmarks.googleAds.current.cpa, formatCurrency),
          formatPlatformMetric("Meta", mediaBenchmarks.metaAds.current.cpa, formatCurrency),
        ].filter(Boolean) as string[],
      },
    ],
    [
      kpis.conversionRate,
      kpis.cpa,
      kpis.leads,
      kpis.linkClicks,
      kpis.messagesStarted,
      mediaBenchmarks.googleAds.current.conversionRate,
      mediaBenchmarks.googleAds.current.cpa,
      mediaBenchmarks.metaAds.current.conversionRate,
      mediaBenchmarks.metaAds.current.cpa,
    ],
  );

  const rowFour = useMemo<MetricCard[]>(
    () => [
      {
        label: "Investimento",
        value: formatCurrency(kpis.investment),
        caption: "Valor investido",
        notes: [
          formatPlatformMetric("Google", googleCurrent.spend, formatCurrency),
          formatPlatformMetric("Meta", metaCurrent.spend, formatCurrency),
        ].filter(Boolean) as string[],
      },
      {
        label: "Qtd Vendas (Ganhos)",
        value: formatCompact(kpis.purchases || kpis.results),
        caption: "Resultado final do período",
        notes: [
          `Receita ${formatCurrency(kpis.revenue)}`,
          `Resultados ${formatCompact(kpis.results)}`,
        ],
      },
      {
        label: "ROAS",
        value: formatMultiplier(kpis.roas),
        caption: "Receita / investimento",
        notes: [`Receita total ${formatCurrency(kpis.revenue)}`],
      },
    ],
    [
      googleCurrent.spend,
      kpis.investment,
      kpis.purchases,
      kpis.results,
      kpis.revenue,
      kpis.roas,
      metaCurrent.spend,
    ],
  );

  return (
    <section className="space-y-4">
      <div className={cn("grid gap-4", hideAnalytics ? "xl:grid-cols-2" : "xl:grid-cols-3")}>
        {rowOne.map((card) => (
          <div key={card.label}>
            <KpiCard card={card} />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {rowTwo.map((card) => (
          <div key={card.label}>
            <KpiCard card={card} />
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {rowThree.map((card) => (
          <div key={card.label}>
            <KpiCard card={card} />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {rowFour.map((card) => (
          <div key={card.label}>
            <KpiCard card={card} />
          </div>
        ))}
      </div>
    </section>
  );
}