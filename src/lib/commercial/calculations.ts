import type {
  CommercialAggregatedMetric,
  CommercialDailyMetricRecord,
  CommercialSummary,
  CommercialWeeklyPoint,
} from "@/lib/commercial/types";
import { formatWeekLabel, startOfWeekIso } from "@/lib/commercial/utils";

function calculateScoreFromMetrics(metrics: CommercialDailyMetricRecord[]) {
  if (!metrics.length) return 0;

  let activitiesDone = 0;
  let activitiesTotal = 0;
  let activitiesOverdue = 0;
  let advances = 0;
  let won = 0;
  let lost = 0;
  let latestDate = "";
  let coverage = 0;
  let stagnant = 0;

  for (const metric of metrics) {
    activitiesDone += metric.activitiesDoneYesterday;
    activitiesTotal += metric.activitiesTotalYesterday;
    advances += metric.dealsAdvancedYesterday;
    won += metric.dealsWonYesterday;
    lost += metric.dealsLostYesterday;

    if (metric.metricDate >= latestDate) {
      latestDate = metric.metricDate;
      coverage = metric.coveragePercent;
      stagnant = metric.stagnantPercent;
      activitiesOverdue = metric.activitiesOverdue;
    }
  }

  const coverageScore = coverage * 300;
  const totalClosed = won + lost;
  const winRate = totalClosed > 0 ? won / totalClosed : 0;
  const winRateScore = totalClosed > 0 ? winRate * 200 : 0;
  const qualityScore = (1 - stagnant) * 300 + winRateScore;
  const activityRatio =
    activitiesTotal > 0 ? activitiesDone / activitiesTotal : activitiesDone > 0 ? 1 : 0;
  const activityScore = activityRatio * 100 - activitiesOverdue * 10;
  const advanceScore = advances * 50;
  const wonScore = won * 100;
  const lostScore = lost * -50;

  return Math.round(
    coverageScore + qualityScore + activityScore + advanceScore + wonScore + lostScore,
  );
}

export function aggregateCommercialMetrics(
  metrics: CommercialDailyMetricRecord[],
): CommercialAggregatedMetric[] {
  const grouped = new Map<string, CommercialDailyMetricRecord[]>();

  for (const metric of metrics) {
    const current = grouped.get(metric.ownerId) ?? [];
    current.push(metric);
    grouped.set(metric.ownerId, current);
  }

  return Array.from(grouped.entries())
    .map(([ownerId, ownerMetrics]) => {
      const latest = [...ownerMetrics].sort((left, right) =>
        left.metricDate.localeCompare(right.metricDate),
      )[ownerMetrics.length - 1];

      return {
        ownerId,
        ownerName: latest.ownerName,
        ownerEmail: latest.ownerEmail,
        totalOpenDeals: latest.totalOpenDeals,
        dealsUpdatedThisMonth: latest.dealsUpdatedThisMonth,
        coveragePercent: latest.coveragePercent,
        activitiesDoneYesterday: ownerMetrics.reduce(
          (sum, item) => sum + item.activitiesDoneYesterday,
          0,
        ),
        activitiesTotalYesterday: ownerMetrics.reduce(
          (sum, item) => sum + item.activitiesTotalYesterday,
          0,
        ),
        activitiesOverdue: latest.activitiesOverdue,
        dealsAdvancedYesterday: ownerMetrics.reduce(
          (sum, item) => sum + item.dealsAdvancedYesterday,
          0,
        ),
        dealsWonYesterday: ownerMetrics.reduce(
          (sum, item) => sum + item.dealsWonYesterday,
          0,
        ),
        dealsLostYesterday: ownerMetrics.reduce(
          (sum, item) => sum + item.dealsLostYesterday,
          0,
        ),
        advancementPercent:
          latest.totalOpenDeals > 0
            ? ownerMetrics.reduce(
                (sum, item) => sum + item.dealsAdvancedYesterday,
                0,
              ) / latest.totalOpenDeals
            : 0,
        stagnantDeals: latest.stagnantDeals,
        stagnantPercent: latest.stagnantPercent,
        score: calculateScoreFromMetrics(ownerMetrics),
        latestDate: latest.metricDate,
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.ownerName.localeCompare(right.ownerName, "pt-BR"),
    );
}

export function buildCommercialSummary(
  rows: CommercialAggregatedMetric[],
): CommercialSummary {
  return {
    coverage: rows.length
      ? rows.reduce((sum, row) => sum + row.coveragePercent, 0) / rows.length
      : 0,
    activities: rows.reduce((sum, row) => sum + row.activitiesDoneYesterday, 0),
    advances: rows.reduce((sum, row) => sum + row.dealsAdvancedYesterday, 0),
    won: rows.reduce((sum, row) => sum + row.dealsWonYesterday, 0),
    lost: rows.reduce((sum, row) => sum + row.dealsLostYesterday, 0),
    quality: rows.length
      ? rows.reduce((sum, row) => sum + (1 - row.stagnantPercent), 0) / rows.length
      : 0,
    totalDeals: rows.reduce((sum, row) => sum + row.totalOpenDeals, 0),
  };
}

export function buildLeaderboardBuckets(rows: CommercialAggregatedMetric[]) {
  if (!rows.length) {
    return {
      topA: [] as CommercialAggregatedMetric[],
      middle70: [] as CommercialAggregatedMetric[],
      bottomC: [] as CommercialAggregatedMetric[],
    };
  }

  const total = rows.length;
  const topCount = Math.min(total, Math.max(1, Math.round(total * 0.2)));
  const bottomCount = Math.min(
    total - topCount,
    Math.max(1, Math.round(total * 0.1)),
  );

  return {
    topA: rows.slice(0, topCount),
    middle70: rows.slice(topCount, total - bottomCount),
    bottomC: rows.slice(total - bottomCount),
  };
}

export function buildCommercialWeeklyPerformance(
  metrics: CommercialDailyMetricRecord[],
  ownerId: string | null,
): CommercialWeeklyPoint[] {
  if (!ownerId) return [];

  const weekly = new Map<
    string,
    {
      ownerMetrics: CommercialDailyMetricRecord[];
      teamMetrics: CommercialDailyMetricRecord[];
    }
  >();

  for (const metric of metrics) {
    const weekStart = startOfWeekIso(metric.metricDate);
    const bucket =
      weekly.get(weekStart) ?? { ownerMetrics: [], teamMetrics: [] };

    bucket.teamMetrics.push(metric);

    if (metric.ownerId === ownerId) {
      bucket.ownerMetrics.push(metric);
    }

    weekly.set(weekStart, bucket);
  }

  return Array.from(weekly.entries())
    .map(([weekStart, value]) => {
      const uniqueOwners = Array.from(
        new Set(value.teamMetrics.map((metric) => metric.ownerId)),
      );

      const totalScore = uniqueOwners.reduce((sum, currentOwnerId) => {
        return (
          sum +
          calculateScoreFromMetrics(
            value.teamMetrics.filter(
              (metric) => metric.ownerId === currentOwnerId,
            ),
          )
        );
      }, 0);

      return {
        weekStart,
        weekLabel: formatWeekLabel(weekStart),
        ownerScore: calculateScoreFromMetrics(value.ownerMetrics),
        teamAverageScore: uniqueOwners.length
          ? Math.round(totalScore / uniqueOwners.length)
          : 0,
      };
    })
    .sort((left, right) => left.weekStart.localeCompare(right.weekStart));
}
