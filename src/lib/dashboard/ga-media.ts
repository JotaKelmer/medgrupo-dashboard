import type {
  DailyMetricRecord,
  DashboardMediaBenchmark,
  DashboardMediaBenchmarks,
  DashboardMediaSnapshot,
  PlatformType,
} from "./types";

type DateRange = {
  startDate: string;
  endDate: string;
};

function parseUtcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getInclusivePeriodLength(startDate: string, endDate: string) {
  const start = parseUtcDate(startDate).getTime();
  const end = parseUtcDate(endDate).getTime();
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function getHistoricalFetchRange(
  currentStartDate: string,
  currentEndDate: string,
  cycles = 6,
): DateRange {
  const periodLength = getInclusivePeriodLength(currentStartDate, currentEndDate);
  const currentStart = parseUtcDate(currentStartDate);
  const previousEnd = addDays(currentStart, -1);
  const historicalStart = addDays(previousEnd, -(periodLength * cycles) + 1);

  return {
    startDate: toISODate(historicalStart),
    endDate: toISODate(previousEnd),
  };
}

function buildHistoricalWindows(
  currentStartDate: string,
  currentEndDate: string,
  cycles = 6,
): DateRange[] {
  const periodLength = getInclusivePeriodLength(currentStartDate, currentEndDate);
  const currentStart = parseUtcDate(currentStartDate);

  const windows: DateRange[] = [];
  let endCursor = addDays(currentStart, -1);

  for (let index = 0; index < cycles; index += 1) {
    const startCursor = addDays(endCursor, -(periodLength - 1));

    windows.push({
      startDate: toISODate(startCursor),
      endDate: toISODate(endCursor),
    });

    endCursor = addDays(startCursor, -1);
  }

  return windows;
}

function isInsideRange(date: string, range: DateRange) {
  return date >= range.startDate && date <= range.endDate;
}

function resolveAcquisitions(signups: number, messagesStarted: number, results: number) {
  const directAcquisitions = signups + messagesStarted;
  if (directAcquisitions > 0) return directAcquisitions;
  return results;
}

function aggregateSnapshot(
  rows: DailyMetricRecord[],
  platform: PlatformType,
): DashboardMediaSnapshot {
  const platformRows = rows.filter((row) => row.platform === platform);

  const impressions = platformRows.reduce((sum, row) => sum + Number(row.impressions || 0), 0);
  const clicks = platformRows.reduce((sum, row) => sum + Number(row.clicks || 0), 0);
  const spend = platformRows.reduce((sum, row) => sum + Number(row.spend || 0), 0);
  const signups = platformRows.reduce((sum, row) => sum + Number(row.leads || 0), 0);
  const messagesStarted = platformRows.reduce(
    (sum, row) => sum + Number(row.messagesStarted || 0),
    0,
  );
  const results = platformRows.reduce((sum, row) => sum + Number(row.results || 0), 0);
  const acquisitions = resolveAcquisitions(signups, messagesStarted, results);

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpa = acquisitions > 0 ? spend / acquisitions : null;
  const conversionRate = clicks > 0 ? (acquisitions / clicks) * 100 : 0;

  return {
    impressions,
    clicks,
    spend,
    signups,
    messagesStarted,
    acquisitions,
    ctr,
    cpa,
    conversionRate,
  };
}

function averageSnapshots(items: DashboardMediaSnapshot[]): DashboardMediaSnapshot | null {
  if (!items.length) return null;

  const total = items.reduce(
    (acc, item) => {
      acc.impressions += item.impressions;
      acc.clicks += item.clicks;
      acc.spend += item.spend;
      acc.signups += item.signups;
      acc.messagesStarted += item.messagesStarted;
      acc.acquisitions += item.acquisitions;
      acc.ctr += item.ctr;
      acc.conversionRate += item.conversionRate;
      acc.cpaValues += item.cpa ?? 0;
      acc.cpaCount += item.cpa !== null ? 1 : 0;
      return acc;
    },
    {
      impressions: 0,
      clicks: 0,
      spend: 0,
      signups: 0,
      messagesStarted: 0,
      acquisitions: 0,
      ctr: 0,
      conversionRate: 0,
      cpaValues: 0,
      cpaCount: 0,
    },
  );

  return {
    impressions: total.impressions / items.length,
    clicks: total.clicks / items.length,
    spend: total.spend / items.length,
    signups: total.signups / items.length,
    messagesStarted: total.messagesStarted / items.length,
    acquisitions: total.acquisitions / items.length,
    ctr: total.ctr / items.length,
    conversionRate: total.conversionRate / items.length,
    cpa: total.cpaCount > 0 ? total.cpaValues / total.cpaCount : null,
  };
}

function buildBenchmark(
  currentRows: DailyMetricRecord[],
  historicalRows: DailyMetricRecord[],
  platform: PlatformType,
  currentStartDate: string,
  currentEndDate: string,
  cycles: number,
): DashboardMediaBenchmark {
  const current = aggregateSnapshot(currentRows, platform);

  const windows = buildHistoricalWindows(currentStartDate, currentEndDate, cycles);

  const historicalAverage = averageSnapshots(
    windows.map((window) =>
      aggregateSnapshot(
        historicalRows.filter((row) => isInsideRange(row.metricDate, window)),
        platform,
      ),
    ),
  );

  return {
    current,
    historicalAverage,
  };
}

export function buildDashboardMediaBenchmarks(input: {
  currentRows: DailyMetricRecord[];
  historicalRows: DailyMetricRecord[];
  currentStartDate: string;
  currentEndDate: string;
  cycles?: number;
}): DashboardMediaBenchmarks {
  const cycles = input.cycles ?? 6;

  return {
    googleAds: buildBenchmark(
      input.currentRows,
      input.historicalRows,
      "google",
      input.currentStartDate,
      input.currentEndDate,
      cycles,
    ),
    metaAds: buildBenchmark(
      input.currentRows,
      input.historicalRows,
      "meta",
      input.currentStartDate,
      input.currentEndDate,
      cycles,
    ),
  };
}
