import "server-only";

import type {
  CommercialDailyMetricRecord,
  CommercialFilters,
  CommercialOverviewData,
} from "@/lib/commercial/types";
import { buildCommercialMockMetrics } from "@/lib/commercial/mock";
import {
  getDefaultCommercialPeriod,
  getPreviousPeriod,
  normalizeDateParam,
  normalizeOwnerParam,
} from "@/lib/commercial/utils";
import {
  assertSupabaseServerDataClient,
  getSupabaseConfigDiagnostics,
  shouldUseMocks,
} from "@/lib/supabase/admin";

type CommercialMetricRowDb = {
  id: string;
  workspace_id: string;
  metric_date: string;
  owner_external_id: string;
  owner_name: string;
  owner_email: string | null;
  total_open_deals: number | string | null;
  deals_updated_this_month: number | string | null;
  coverage_percent: number | string | null;
  activities_done_yesterday: number | string | null;
  activities_total_yesterday: number | string | null;
  activities_overdue: number | string | null;
  deals_advanced_yesterday: number | string | null;
  deals_won_yesterday: number | string | null;
  deals_lost_yesterday: number | string | null;
  advancement_percent: number | string | null;
  stagnant_deals: number | string | null;
  stagnant_percent: number | string | null;
  source: string | null;
  synced_at: string | null;
};

function mapCommercialMetricRow(
  row: CommercialMetricRowDb,
): CommercialDailyMetricRecord {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    metricDate: String(row.metric_date),
    ownerId: String(row.owner_external_id),
    ownerName: String(row.owner_name),
    ownerEmail: typeof row.owner_email === "string" ? row.owner_email : null,
    totalOpenDeals: Number(row.total_open_deals ?? 0),
    dealsUpdatedThisMonth: Number(row.deals_updated_this_month ?? 0),
    coveragePercent: Number(row.coverage_percent ?? 0),
    activitiesDoneYesterday: Number(row.activities_done_yesterday ?? 0),
    activitiesTotalYesterday: Number(row.activities_total_yesterday ?? 0),
    activitiesOverdue: Number(row.activities_overdue ?? 0),
    dealsAdvancedYesterday: Number(row.deals_advanced_yesterday ?? 0),
    dealsWonYesterday: Number(row.deals_won_yesterday ?? 0),
    dealsLostYesterday: Number(row.deals_lost_yesterday ?? 0),
    advancementPercent: Number(row.advancement_percent ?? 0),
    stagnantDeals: Number(row.stagnant_deals ?? 0),
    stagnantPercent: Number(row.stagnant_percent ?? 0),
    source: typeof row.source === "string" ? row.source : null,
    syncedAt: typeof row.synced_at === "string" ? row.synced_at : null,
  };
}

function buildSellerOptions(metrics: CommercialDailyMetricRecord[]) {
  return Array.from(
    new Map(
      metrics.map((metric) => [
        metric.ownerId,
        {
          value: metric.ownerId,
          label: metric.ownerName,
          email: metric.ownerEmail,
        },
      ]),
    ).values(),
  ).sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
}

function fallbackOverview(
  workspaceId: string,
  filters: CommercialFilters,
  canEdit: boolean,
  viewerEmail: string | null,
  role: CommercialOverviewData["role"],
): CommercialOverviewData {
  const { previousStartDate, previousEndDate } = getPreviousPeriod(
    filters.startDate,
    filters.endDate,
  );

  const metrics = buildCommercialMockMetrics(
    workspaceId,
    filters.startDate,
    filters.endDate,
  );

  const previousMetrics = buildCommercialMockMetrics(
    workspaceId,
    previousStartDate,
    previousEndDate,
  );

  return {
    filters,
    metrics,
    previousMetrics,
    sellerOptions: buildSellerOptions(metrics),
    canEdit,
    viewerEmail,
    role,
    isMock: true,
  };
}

export function parseCommercialFilters(
  workspaceId: string,
  input?: Record<string, string | string[] | undefined>,
): CommercialFilters {
  const defaults = getDefaultCommercialPeriod();

  const startDate =
    normalizeDateParam(input?.startDate ?? input?.start ?? input?.from) ??
    defaults.startDate;
  const endDate =
    normalizeDateParam(input?.endDate ?? input?.end ?? input?.to) ??
    defaults.endDate;

  return {
    workspaceId,
    startDate: startDate <= endDate ? startDate : defaults.startDate,
    endDate: startDate <= endDate ? endDate : defaults.endDate,
    ownerId: normalizeOwnerParam(input?.ownerId ?? input?.owner ?? input?.seller),
  };
}

export async function getCommercialOverview(options: {
  workspaceId: string;
  filters: CommercialFilters;
  canEdit: boolean;
  viewerEmail: string | null;
  role: CommercialOverviewData["role"];
}): Promise<CommercialOverviewData> {
  const { workspaceId, filters, canEdit, viewerEmail, role } = options;
  const { previousStartDate, previousEndDate } = getPreviousPeriod(
    filters.startDate,
    filters.endDate,
  );

  if (shouldUseMocks()) {
    return fallbackOverview(workspaceId, filters, canEdit, viewerEmail, role);
  }

  try {
    const supabase = assertSupabaseServerDataClient();

    const { data, error } = await supabase
      .from("commercial_daily_metrics")
      .select(
        [
          "id",
          "workspace_id",
          "metric_date",
          "owner_external_id",
          "owner_name",
          "owner_email",
          "total_open_deals",
          "deals_updated_this_month",
          "coverage_percent",
          "activities_done_yesterday",
          "activities_total_yesterday",
          "activities_overdue",
          "deals_advanced_yesterday",
          "deals_won_yesterday",
          "deals_lost_yesterday",
          "advancement_percent",
          "stagnant_deals",
          "stagnant_percent",
          "source",
          "synced_at",
        ].join(", "),
      )
      .eq("workspace_id", workspaceId)
      .gte("metric_date", previousStartDate)
      .lte("metric_date", filters.endDate)
      .order("metric_date", { ascending: true })
      .order("owner_name", { ascending: true });

    if (error) {
      throw error;
    }

    const dbRows: CommercialMetricRowDb[] = Array.isArray(data)
      ? (data as unknown as CommercialMetricRowDb[])
      : [];

    const rows = dbRows.map((row) => mapCommercialMetricRow(row));

    const metrics = rows.filter(
      (row) =>
        row.metricDate >= filters.startDate && row.metricDate <= filters.endDate,
    );

    const previousMetrics = rows.filter(
      (row) =>
        row.metricDate >= previousStartDate &&
        row.metricDate <= previousEndDate,
    );

    return {
      filters,
      metrics,
      previousMetrics,
      sellerOptions: buildSellerOptions(metrics),
      canEdit,
      viewerEmail,
      role,
      isMock: false,
    };
  } catch (error) {
    console.error("[commercial] fallback to mock", {
      diagnostics: getSupabaseConfigDiagnostics(),
      message: error instanceof Error ? error.message : String(error),
    });

    return fallbackOverview(workspaceId, filters, canEdit, viewerEmail, role);
  }
}