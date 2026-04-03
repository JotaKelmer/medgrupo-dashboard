import type {
  Ga4BenchmarkMetric,
  Ga4DashboardResponse,
  Ga4DateRange,
  Ga4HeroCards,
  Ga4SiteConversion,
  Ga4SiteShareCard,
  Ga4SiteShareSource,
  Ga4TrendStatus,
} from '@/types/ga4-dashboard';

import type { Ga4ReportResponse, Ga4ReportRow } from './ga4-client';

const INTEGER_FORMATTER = new Intl.NumberFormat('pt-BR');
const PERCENT_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const HERO_ORDER: Ga4SiteShareSource[] = ['Google Ads', 'Meta Ads', 'Orgânico'];
const TREND_TOLERANCE_PCT = 5;

type SummaryMetricMap = {
  totalUsers: number;
  sessions: number;
  engagementRate: number;
  keyEvents: number;
};

type BucketAccumulator = {
  sessions: number;
  totalUsers: number;
  signups: number;
};

function parseMetricValue(value: string | null | undefined) {
  if (!value) return 0;

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getPrimaryRow(report: Ga4ReportResponse): Ga4ReportRow | null {
  return report.rows?.[0] ?? report.totals?.[0] ?? null;
}

function formatNumber(value: number) {
  return INTEGER_FORMATTER.format(Math.round(value));
}

function formatPercent(value: number) {
  return `${PERCENT_FORMATTER.format(value)}%`;
}

function calculateDeltaPct(current: number, base: number): number | null {
  if (base === 0) {
    return current === 0 ? 0 : null;
  }

  return ((current - base) / Math.abs(base)) * 100;
}

function getTrendStatus(
  current: number,
  historicalAverage: number | null,
  higherIsBetter = true,
): Ga4TrendStatus {
  if (historicalAverage === null || historicalAverage === 0) {
    return 'neutral';
  }

  const deltaPct = calculateDeltaPct(current, historicalAverage);

  if (deltaPct === null) {
    return 'neutral';
  }

  if (Math.abs(deltaPct) <= TREND_TOLERANCE_PCT) {
    return 'average';
  }

  if (higherIsBetter) {
    return deltaPct > 0 ? 'above' : 'below';
  }

  return deltaPct < 0 ? 'above' : 'below';
}

function buildBenchmarkMetric(input: {
  current: number;
  previous: number;
  historicalAverage: number | null;
  unit: 'number' | 'percent';
  higherIsBetter?: boolean;
}): Ga4BenchmarkMetric {
  const higherIsBetter = input.higherIsBetter ?? true;

  return {
    value: input.current,
    previousValue: input.previous,
    historicalAverage: input.historicalAverage,
    deltaVsPreviousPct: calculateDeltaPct(input.current, input.previous),
    deltaVsHistoricalPct:
      input.historicalAverage === null
        ? null
        : calculateDeltaPct(input.current, input.historicalAverage),
    status: getTrendStatus(input.current, input.historicalAverage, higherIsBetter),
    unit: input.unit,
    formattedValue:
      input.unit === 'percent'
        ? formatPercent(input.current)
        : formatNumber(input.current),
    formattedPreviousValue:
      input.unit === 'percent'
        ? formatPercent(input.previous)
        : formatNumber(input.previous),
    formattedHistoricalAverage:
      input.historicalAverage === null
        ? '—'
        : input.unit === 'percent'
          ? formatPercent(input.historicalAverage)
          : formatNumber(input.historicalAverage),
  };
}

function getSummaryMetrics(report: Ga4ReportResponse): SummaryMetricMap {
  const row = getPrimaryRow(report);

  return {
    totalUsers: parseMetricValue(row?.metricValues?.[0]?.value),
    sessions: parseMetricValue(row?.metricValues?.[1]?.value),
    engagementRate: parseMetricValue(row?.metricValues?.[2]?.value) * 100,
    keyEvents: parseMetricValue(row?.metricValues?.[3]?.value),
  };
}

function average(values: number[]) {
  if (!values.length) return null;

  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

function classifySourceBucket(sourceMedium: string): Ga4SiteShareSource | null {
  const normalized = sourceMedium.toLowerCase();

  const isGoogleAds =
    normalized.includes('google') &&
    /(cpc|ppc|paid|ads|search)/.test(normalized) &&
    !normalized.includes('organic');

  if (isGoogleAds) {
    return 'Google Ads';
  }

  const isMetaSource = /(facebook|instagram|meta)/.test(normalized);
  const isMetaPaid = /(cpc|paid|social|ads|cpm)/.test(normalized);

  if (isMetaSource && isMetaPaid) {
    return 'Meta Ads';
  }

  const isOrganic =
    normalized.includes('/ organic') ||
    normalized.endsWith('organic') ||
    /(google|bing|yahoo) \/ organic/.test(normalized);

  if (isOrganic) {
    return 'Orgânico';
  }

  return null;
}

function buildSeedRecord() {
  return {
    'Google Ads': {
      sessions: 0,
      totalUsers: 0,
      signups: 0,
    },
    'Meta Ads': {
      sessions: 0,
      totalUsers: 0,
      signups: 0,
    },
    Orgânico: {
      sessions: 0,
      totalUsers: 0,
      signups: 0,
    },
  } satisfies Record<Ga4SiteShareSource, BucketAccumulator>;
}

function aggregateSourceReport(report: Ga4ReportResponse) {
  const rows = report.rows ?? [];
  const buckets = buildSeedRecord();
  let totalSessions = 0;

  rows.forEach((row) => {
    const sourceMedium = row.dimensionValues?.[0]?.value ?? '';
    const bucketName = classifySourceBucket(sourceMedium);

    if (!bucketName) return;

    const totalUsers = parseMetricValue(row.metricValues?.[0]?.value);
    const sessions = parseMetricValue(row.metricValues?.[1]?.value);
    const signups = parseMetricValue(row.metricValues?.[2]?.value);

    buckets[bucketName].totalUsers += totalUsers;
    buckets[bucketName].sessions += sessions;
    buckets[bucketName].signups += signups;

    totalSessions += sessions;
  });

  return {
    buckets,
    totalSessions,
  };
}

function mapSiteShare(
  currentSourceReport: Ga4ReportResponse,
  previousSourceReport: Ga4ReportResponse,
): Ga4SiteShareCard[] {
  const current = aggregateSourceReport(currentSourceReport);
  const previous = aggregateSourceReport(previousSourceReport);

  return HERO_ORDER.map((source) => {
    const currentBucket = current.buckets[source];
    const previousBucket = previous.buckets[source];

    const sharePct =
      current.totalSessions > 0
        ? (currentBucket.sessions / current.totalSessions) * 100
        : 0;

    const previousSharePct =
      previous.totalSessions > 0
        ? (previousBucket.sessions / previous.totalSessions) * 100
        : 0;

    return {
      source,
      sessions: currentBucket.sessions,
      totalUsers: currentBucket.totalUsers,
      signups: currentBucket.signups,
      sharePct,
      previousSharePct,
      deltaSharePct: calculateDeltaPct(sharePct, previousSharePct),
    };
  });
}

function mapHeroCards(
  currentSummary: SummaryMetricMap,
  previousSummary: SummaryMetricMap,
  historicalSummaries: SummaryMetricMap[],
): Ga4HeroCards {
  return {
    visits: buildBenchmarkMetric({
      current: currentSummary.sessions,
      previous: previousSummary.sessions,
      historicalAverage: average(historicalSummaries.map((item) => item.sessions)),
      unit: 'number',
    }),
    engagement: buildBenchmarkMetric({
      current: currentSummary.engagementRate,
      previous: previousSummary.engagementRate,
      historicalAverage: average(
        historicalSummaries.map((item) => item.engagementRate),
      ),
      unit: 'percent',
    }),
    signups: buildBenchmarkMetric({
      current: currentSummary.keyEvents,
      previous: previousSummary.keyEvents,
      historicalAverage: average(historicalSummaries.map((item) => item.keyEvents)),
      unit: 'number',
    }),
  };
}

function mapSiteConversion(
  currentSummary: SummaryMetricMap,
  previousSummary: SummaryMetricMap,
  historicalSummaries: SummaryMetricMap[],
): Ga4SiteConversion {
  const currentRate =
    currentSummary.sessions > 0
      ? (currentSummary.keyEvents / currentSummary.sessions) * 100
      : 0;

  const previousRate =
    previousSummary.sessions > 0
      ? (previousSummary.keyEvents / previousSummary.sessions) * 100
      : 0;

  const historicalAverage = average(
    historicalSummaries.map((item) =>
      item.sessions > 0 ? (item.keyEvents / item.sessions) * 100 : 0,
    ),
  );

  return {
    metric: buildBenchmarkMetric({
      current: currentRate,
      previous: previousRate,
      historicalAverage,
      unit: 'percent',
    }),
    siteVisits: currentSummary.sessions,
    siteVisitors: currentSummary.totalUsers,
    signups: currentSummary.keyEvents,
  };
}

export function buildGa4DashboardPayload(input: {
  propertyId: string;
  currentRange: Ga4DateRange;
  previousRange: Ga4DateRange;
  currentSummaryReport: Ga4ReportResponse;
  previousSummaryReport: Ga4ReportResponse;
  historicalSummaryReports: Ga4ReportResponse[];
  currentSourceReport: Ga4ReportResponse;
  previousSourceReport: Ga4ReportResponse;
}): Ga4DashboardResponse {
  const currentSummary = getSummaryMetrics(input.currentSummaryReport);
  const previousSummary = getSummaryMetrics(input.previousSummaryReport);
  const historicalSummaries = input.historicalSummaryReports.map(getSummaryMetrics);

  return {
    propertyId: input.propertyId,
    range: {
      current: input.currentRange,
      previous: input.previousRange,
    },
    heroCards: mapHeroCards(currentSummary, previousSummary, historicalSummaries),
    siteShare: mapSiteShare(input.currentSourceReport, input.previousSourceReport),
    siteConversion: mapSiteConversion(
      currentSummary,
      previousSummary,
      historicalSummaries,
    ),
    generatedAt: new Date().toISOString(),
  };
}