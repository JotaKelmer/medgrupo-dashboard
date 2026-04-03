"use client";

import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import type { DashboardMediaBenchmarks } from "@/lib/dashboard/types";

type Ga4TrendStatus = "above" | "average" | "below" | "neutral";

type Ga4Metric = {
  value: number;
  previousValue: number;
  historicalAverage: number | null;
  formattedValue: string;
  formattedPreviousValue: string;
  formattedHistoricalAverage: string;
  deltaVsPreviousPct: number | null;
  deltaVsHistoricalPct: number | null;
  status: Ga4TrendStatus;
};

type Ga4HeroCards = {
  visits: Ga4Metric;
  engagement: Ga4Metric;
  signups: Ga4Metric;
};

type Ga4SiteShareCard = {
  source: "Google Ads" | "Meta Ads" | "Orgânico";
  sessions: number;
  totalUsers: number;
  signups: number;
  sharePct: number;
  previousSharePct: number;
  deltaSharePct: number | null;
};

type Ga4SiteConversion = {
  metric: Ga4Metric;
  siteVisits: number;
  siteVisitors: number;
  signups: number;
};

type Ga4DashboardResponse = {
  propertyId: string;
  range: {
    current: {
      startDate: string;
      endDate: string;
    };
    previous: {
      startDate: string;
      endDate: string;
    };
  };
  heroCards: Ga4HeroCards;
  siteShare: Ga4SiteShareCard[];
  siteConversion: Ga4SiteConversion;
  generatedAt: string;
};

type Props = {
  startDate?: string;
  endDate?: string;
  compareStartDate?: string;
  compareEndDate?: string;
  historyCycles?: number;
  mediaBenchmarks?: DashboardMediaBenchmarks;
  title?: string;
  className?: string;
};

type State = {
  data: Ga4DashboardResponse | null;
  loading: boolean;
  error: string | null;
};

const NUMBER_FORMATTER = new Intl.NumberFormat("pt-BR");
const PERCENT_FORMATTER = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(" ");
}

function formatNumber(value: number) {
  return NUMBER_FORMATTER.format(Math.round(value));
}

function formatPercent(value: number) {
  return `${PERCENT_FORMATTER.format(value)}%`;
}

function formatCurrency(value: number) {
  return CURRENCY_FORMATTER.format(value);
}

function formatDelta(delta: number | null) {
  if (delta === null) return "sem base";
  const prefix = delta > 0 ? "+" : "";
  return `${prefix}${formatPercent(delta)}`;
}

function buildRequestUrl(props: Props) {
  const params = new URLSearchParams();

  if (props.startDate) params.set("startDate", props.startDate);
  if (props.endDate) params.set("endDate", props.endDate);
  if (props.compareStartDate) params.set("compareStartDate", props.compareStartDate);
  if (props.compareEndDate) params.set("compareEndDate", props.compareEndDate);
  if (props.historyCycles) params.set("historyCycles", String(props.historyCycles));

  const query = params.toString();
  return query ? `/api/analytics/ga4?${query}` : "/api/analytics/ga4";
}

function getStatusClasses(status: Ga4TrendStatus) {
  switch (status) {
    case "above":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-300";
    case "average":
      return "border-amber-400/20 bg-amber-500/10 text-amber-300";
    case "below":
      return "border-rose-400/20 bg-rose-500/10 text-rose-300";
    default:
      return "border-white/10 bg-white/5 text-white/60";
  }
}

function getStatusLabel(status: Ga4TrendStatus) {
  switch (status) {
    case "above":
      return "Acima da média";
    case "average":
      return "Na média";
    case "below":
      return "Abaixo da média";
    default:
      return "Sem histórico";
  }
}

function calculateDeltaPct(current: number, base: number | null) {
  if (base === null || base === 0) {
    return current === 0 ? 0 : null;
  }

  return ((current - base) / Math.abs(base)) * 100;
}

function calculateStatus(
  current: number | null,
  historicalAverage: number | null,
  higherIsBetter = true,
): Ga4TrendStatus {
  if (current === null || historicalAverage === null || historicalAverage === 0) {
    return "neutral";
  }

  const deltaPct = calculateDeltaPct(current, historicalAverage);

  if (deltaPct === null) {
    return "neutral";
  }

  if (Math.abs(deltaPct) <= 5) {
    return "average";
  }

  if (higherIsBetter) {
    return deltaPct > 0 ? "above" : "below";
  }

  return deltaPct < 0 ? "above" : "below";
}

type MetricCardRow = {
  label: string;
  value: number | null;
  historicalAverage: number | null;
  status: Ga4TrendStatus;
  formattedValue: string;
  formattedHistoricalAverage: string;
};

function buildCtrMetric(
  label: string,
  benchmark?: DashboardMediaBenchmarks["googleAds"],
): MetricCardRow | null {
  if (!benchmark) return null;

  return {
    label,
    value: benchmark.current.ctr,
    historicalAverage: benchmark.historicalAverage?.ctr ?? null,
    status: calculateStatus(
      benchmark.current.ctr,
      benchmark.historicalAverage?.ctr ?? null,
      true,
    ),
    formattedValue: formatPercent(benchmark.current.ctr),
    formattedHistoricalAverage:
      benchmark.historicalAverage?.ctr !== null &&
      benchmark.historicalAverage?.ctr !== undefined
        ? formatPercent(benchmark.historicalAverage.ctr)
        : "—",
  };
}

function buildCpaMetric(
  label: string,
  benchmark?: DashboardMediaBenchmarks["googleAds"],
): MetricCardRow | null {
  if (!benchmark || benchmark.current.cpa === null) return null;

  return {
    label,
    value: benchmark.current.cpa,
    historicalAverage: benchmark.historicalAverage?.cpa ?? null,
    status: calculateStatus(
      benchmark.current.cpa,
      benchmark.historicalAverage?.cpa ?? null,
      false,
    ),
    formattedValue: formatCurrency(benchmark.current.cpa),
    formattedHistoricalAverage:
      benchmark.historicalAverage?.cpa !== null &&
      benchmark.historicalAverage?.cpa !== undefined
        ? formatCurrency(benchmark.historicalAverage.cpa)
        : "—",
  };
}

function buildConversionMetric(
  label: string,
  benchmark?: DashboardMediaBenchmarks["googleAds"],
): MetricCardRow | null {
  if (!benchmark) return null;

  return {
    label,
    value: benchmark.current.conversionRate,
    historicalAverage: benchmark.historicalAverage?.conversionRate ?? null,
    status: calculateStatus(
      benchmark.current.conversionRate,
      benchmark.historicalAverage?.conversionRate ?? null,
      true,
    ),
    formattedValue: formatPercent(benchmark.current.conversionRate),
    formattedHistoricalAverage:
      benchmark.historicalAverage?.conversionRate !== null &&
      benchmark.historicalAverage?.conversionRate !== undefined
        ? formatPercent(benchmark.historicalAverage.conversionRate)
        : "—",
  };
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-3xl border border-white/10 bg-white/5"
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-44 animate-pulse rounded-3xl border border-white/10 bg-white/5"
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-56 animate-pulse rounded-3xl border border-white/10 bg-white/5"
          />
        ))}
      </div>
    </div>
  );
}

function Semaforo({ status }: { status: Ga4TrendStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        getStatusClasses(status),
      )}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function HeroCard({
  title,
  metric,
  note,
}: {
  title: string;
  metric: Ga4Metric;
  note: string;
}) {
  return (
    <Card className="min-h-[148px] space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-white/45">{title}</p>
        <p className="mt-3 text-3xl font-semibold text-[var(--color-lime)]">
          {metric.formattedValue}
        </p>
        <p className="mt-2 text-sm text-white/55">{note}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/[0.04] p-3">
          <p className="text-xs text-white/45">Período anterior</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {metric.formattedPreviousValue}
          </p>
          <p className="mt-1 text-xs text-white/45">
            {formatDelta(metric.deltaVsPreviousPct)}
          </p>
        </div>

        <div className="rounded-2xl bg-white/[0.04] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-white/45">Média histórica</p>
            <Semaforo status={metric.status} />
          </div>
          <p className="mt-1 text-sm font-semibold text-white">
            {metric.formattedHistoricalAverage}
          </p>
          <p className="mt-1 text-xs text-white/45">
            {formatDelta(metric.deltaVsHistoricalPct)}
          </p>
        </div>
      </div>
    </Card>
  );
}

function ShareCard({ item }: { item: Ga4SiteShareCard }) {
  return (
    <Card className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-white/45">
          {item.source}
        </p>
        <p className="mt-3 text-3xl font-semibold text-[var(--color-lime)]">
          {formatPercent(item.sharePct)}
        </p>
        <p className="mt-1 text-sm text-white/55">participação no site</p>
      </div>

      <div className="rounded-2xl bg-white/[0.04] p-3 text-xs text-white/50">
        anterior: {formatPercent(item.previousSharePct)}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white/[0.04] p-3">
          <p className="text-xs text-white/45">Visitas</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {formatNumber(item.sessions)}
          </p>
        </div>
        <div className="rounded-2xl bg-white/[0.04] p-3">
          <p className="text-xs text-white/45">Usuários</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {formatNumber(item.totalUsers)}
          </p>
        </div>
        <div className="rounded-2xl bg-white/[0.04] p-3">
          <p className="text-xs text-white/45">Inscrições</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {formatNumber(item.signups)}
          </p>
        </div>
      </div>
    </Card>
  );
}

function IndicatorShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: any;
}) {
  return (
    <Card className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-white/45">{title}</p>
        <p className="mt-2 text-sm text-white/55">{subtitle}</p>
      </div>
      {children}
    </Card>
  );
}

function MetricRow({ item }: { item: MetricCardRow }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">{item.label}</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-lime)]">
            {item.formattedValue}
          </p>
        </div>

        <Semaforo status={item.status} />
      </div>

      <p className="mt-3 text-xs text-white/45">
        Média histórica: {item.formattedHistoricalAverage}
      </p>
    </div>
  );
}

function MissingMediaState({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">
      {title}
    </div>
  );
}

export function Ga4OverviewPanel({
  startDate,
  endDate,
  compareStartDate,
  compareEndDate,
  historyCycles = 6,
  mediaBenchmarks,
  title = "Google Analytics",
  className,
}: Props) {
  const requestUrl = useMemo(
    () =>
      buildRequestUrl({
        startDate,
        endDate,
        compareStartDate,
        compareEndDate,
        historyCycles,
      }),
    [startDate, endDate, compareStartDate, compareEndDate, historyCycles],
  );

  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setState((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const response = await fetch(requestUrl, {
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
          data: payload as Ga4DashboardResponse,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        setState({
          data: null,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Erro desconhecido ao carregar GA4.",
        });
      }
    }

    void load();

    return () => controller.abort();
  }, [requestUrl]);

  const ctrRows = [
    buildCtrMetric("Google Ads", mediaBenchmarks?.googleAds),
    buildCtrMetric("Meta Ads", mediaBenchmarks?.metaAds),
  ].filter(Boolean) as MetricCardRow[];

  const cpaRows = [
    buildCpaMetric("Google Ads", mediaBenchmarks?.googleAds),
    buildCpaMetric("Meta Ads", mediaBenchmarks?.metaAds),
  ].filter(Boolean) as MetricCardRow[];

  const conversionRows = [
    buildConversionMetric("Google específico", mediaBenchmarks?.googleAds),
    buildConversionMetric("Meta específico", mediaBenchmarks?.metaAds),
  ].filter(Boolean) as MetricCardRow[];

  const data = state.data;

  return (
    <section className={cn("space-y-6", className)}>
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-white/45">
          Frente analítica
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm text-white/55">
          Visão principal do site com foco em visitas, engajamento, inscrições,
          representatividade e leitura estratégica.
        </p>
      </div>

      {data ? (
        <Card className="space-y-1">
          <p className="text-sm font-medium text-white">
            {data.range.current.startDate} → {data.range.current.endDate}
          </p>
          <p className="text-xs text-white/45">
            Comparativo: {data.range.previous.startDate} → {data.range.previous.endDate}
          </p>
        </Card>
      ) : null}

      {state.loading && !data ? <LoadingState /> : null}

      {!state.loading && state.error ? (
        <Card className="border border-rose-500/20 bg-rose-500/10">
          <p className="text-sm text-rose-200">{state.error}</p>
        </Card>
      ) : null}

      {!state.loading && data ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <HeroCard
              title="Visitas do Google Analytics"
              metric={data.heroCards.visits}
              note="Volume principal de visitas do site no período."
            />
            <HeroCard
              title="Engajamento do Google Analytics"
              metric={data.heroCards.engagement}
              note="Leitura direta da qualidade das visitas no site."
            />
            <HeroCard
              title="Todas as inscrições do Google Analytics"
              metric={data.heroCards.signups}
              note="Inscrições marcadas como key events no GA4."
            />
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                Representatividade no site
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                Google Ads, Meta Ads e Orgânico
              </h3>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {data.siteShare.map((item) => (
                <ShareCard key={item.source} item={item} />
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <IndicatorShell
              title="CTR"
              subtitle="Prioridade analítica para leitura de eficiência de mídia."
            >
              {ctrRows.length ? (
                <div className="space-y-3">
                  {ctrRows.map((row) => (
                    <MetricRow key={row.label} item={row} />
                  ))}
                </div>
              ) : (
                <MissingMediaState title="Sem dados suficientes de Google Ads / Meta Ads para exibir CTR." />
              )}
            </IndicatorShell>

            <IndicatorShell
              title="CPA / custo por inscrição"
              subtitle="Leitura prioritária de eficiência financeira."
            >
              {cpaRows.length ? (
                <div className="space-y-3">
                  {cpaRows.map((row) => (
                    <MetricRow key={row.label} item={row} />
                  ))}
                </div>
              ) : (
                <MissingMediaState title="Sem dados suficientes de gasto + inscrições para exibir CPA." />
              )}
            </IndicatorShell>

            <IndicatorShell
              title="Taxa de conversão"
              subtitle="Comparação do período contra a média histórica com semáforo."
            >
              <div className="rounded-2xl bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">Site</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--color-lime)]">
                      {data.siteConversion.metric.formattedValue}
                    </p>
                  </div>

                  <Semaforo status={data.siteConversion.metric.status} />
                </div>

                <p className="mt-3 text-xs text-white/45">
                  Média histórica: {data.siteConversion.metric.formattedHistoricalAverage}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-black/20 p-3">
                    <p className="text-xs text-white/45">Visitas</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {formatNumber(data.siteConversion.siteVisits)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-black/20 p-3">
                    <p className="text-xs text-white/45">Visitantes</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {formatNumber(data.siteConversion.siteVisitors)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-black/20 p-3">
                    <p className="text-xs text-white/45">Inscrições</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {formatNumber(data.siteConversion.signups)}
                    </p>
                  </div>
                </div>
              </div>

              {conversionRows.length ? (
                <div className="space-y-3">
                  {conversionRows.map((row) => (
                    <MetricRow key={row.label} item={row} />
                  ))}
                </div>
              ) : null}
            </IndicatorShell>
          </div>
        </>
      ) : null}
    </section>
  );
}