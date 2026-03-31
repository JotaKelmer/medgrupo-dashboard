import {
  buildAlerts,
  buildBudgetComparison,
  buildBudgetState,
  buildCreativeHealth,
  buildDemographics,
  buildFunnel,
  buildKpis,
  buildPerformanceRows,
  buildTimeline,
  normalizeChannels,
  normalizeObjectives,
  toBenchmarkRecord
} from "./calculations";
import { DEFAULT_BENCHMARKS, DEFAULT_DATE_RANGE_DAYS } from "./constants";
import { mockSnapshot } from "./mock";
import type {
  BudgetOverviewData,
  CampaignRecord,
  ControlOverviewData,
  CustomMetricDefinitionRecord,
  CustomMetricValueRecord,
  DashboardFilters,
  DashboardOverviewData,
  DailyMetricRecord,
  DemographicMetricRecord,
  FilterPlatform,
  FunnelRecord,
  FunnelStepRecord,
  SelectOption,
  SyncRunRecord
} from "./types";
import { startDateFromDaysBack, toISODate } from "./utils";
import {
  assertSupabaseServerDataClient,
  getSupabaseConfigDiagnostics,
  shouldUseMocks
} from "@/lib/supabase/admin";

const SELECT_WORKSPACES = "id, name";
const SELECT_CAMPAIGNS = "id, workspace_id, ad_account_id, platform, external_id, name, objective, status";
const SELECT_FUNNELS = "id, workspace_id, name, description, category, is_default, is_active";
const SELECT_FUNNEL_STEPS = "id, funnel_id, step_key, step_label, step_order, source_type, metric_source, is_active";
const SELECT_DAILY_METRICS = [
  "id",
  "workspace_id",
  "ad_account_id",
  "campaign_id",
  "ad_set_id",
  "ad_id",
  "platform",
  "metric_date",
  "impressions",
  "reach",
  "clicks",
  "link_clicks",
  "landing_page_views",
  "messages_started",
  "engagements",
  "leads",
  "checkouts",
  "purchases",
  "results",
  "result_label",
  "spend",
  "revenue",
  "video_views_25",
  "video_views_50",
  "video_views_75",
  "video_views_100",
  "ctr",
  "cpm",
  "cpc",
  "cost_per_result"
].join(", ");
const SELECT_DEMOGRAPHICS = [
  "id",
  "workspace_id",
  "ad_account_id",
  "campaign_id",
  "ad_set_id",
  "ad_id",
  "platform",
  "metric_date",
  "age_range",
  "gender",
  "impressions",
  "clicks",
  "link_clicks",
  "results",
  "spend"
].join(", ");
const SELECT_CUSTOM_METRIC_DEFINITIONS = "id, workspace_id, metric_key, metric_label, description, data_type, is_active";
const SELECT_CUSTOM_METRIC_VALUES = "id, workspace_id, campaign_id, ad_set_id, ad_id, metric_definition_id, metric_date, metric_value";
const SELECT_CREATIVE_RULES = "id, workspace_id, good_max, attention_max, replace_max, critical_max";
const SELECT_SYNC_RUNS = "id, workspace_id, platform, status, started_at, finished_at, inserted_rows, error_message";
const SELECT_BUDGET_PLAN = "id, workspace_id, name, period_days, total_budget, start_date, end_date, notes, is_active";
const SELECT_BUDGET_CHANNELS = "id, budget_plan_id, platform, percentage, amount";
const SELECT_BUDGET_OBJECTIVES = "id, budget_plan_id, platform, objective, percentage, period_days, daily_budget, total_budget, sort_order";
const SELECT_BENCHMARKS = "workspace_id, platform, metric_key, metric_label, metric_value";
const SELECT_ADS = "id, name";

const IN_QUERY_CHUNK_SIZE = 150;

type WorkspaceContext = {
  workspaceOptions: SelectOption[];
  preferredWorkspaceId: string;
};

function toStringValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function numberValue(value: unknown) {
  return Number(value ?? 0);
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function logQueryError(scope: string, error: unknown, details?: Record<string, unknown>) {
  console.error(`[dashboard:${scope}]`);
  if (details) console.error("context:", details);
  console.error("supabase:", getSupabaseConfigDiagnostics());
  console.dir(error, { depth: null });
}

function getSupabaseOrThrow() {
  return assertSupabaseServerDataClient();
}

export function parseFilters(input?: Record<string, string | string[] | undefined>): DashboardFilters {
  return {
    workspaceId: toStringValue(input?.workspaceId),
    startDate: toStringValue(input?.startDate),
    endDate: toStringValue(input?.endDate),
    campaignId: toStringValue(input?.campaignId),
    platform: (toStringValue(input?.platform) as FilterPlatform | undefined) ?? undefined,
    funnelId: toStringValue(input?.funnelId)
  };
}

function mapWorkspaceOption(data: Array<{ id: string; name: string }>): SelectOption[] {
  return data.map((item) => ({ value: item.id, label: item.name }));
}

function mapDailyMetricRow(row: any): DailyMetricRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    adAccountId: row.ad_account_id,
    campaignId: row.campaign_id,
    adSetId: row.ad_set_id,
    adId: row.ad_id,
    platform: row.platform,
    metricDate: row.metric_date,
    impressions: numberValue(row.impressions),
    reach: numberValue(row.reach),
    clicks: numberValue(row.clicks),
    linkClicks: numberValue(row.link_clicks),
    landingPageViews: numberValue(row.landing_page_views),
    messagesStarted: numberValue(row.messages_started),
    engagements: numberValue(row.engagements),
    leads: numberValue(row.leads),
    checkouts: numberValue(row.checkouts),
    purchases: numberValue(row.purchases),
    results: numberValue(row.results),
    resultLabel: row.result_label ?? "Resultado",
    spend: numberValue(row.spend),
    revenue: numberValue(row.revenue),
    videoViews25: numberValue(row.video_views_25),
    videoViews50: numberValue(row.video_views_50),
    videoViews75: numberValue(row.video_views_75),
    videoViews100: numberValue(row.video_views_100),
    ctr: numberValue(row.ctr),
    cpm: numberValue(row.cpm),
    cpc: numberValue(row.cpc),
    costPerResult: numberValue(row.cost_per_result)
  };
}

function mapDemographicRow(row: any): DemographicMetricRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    adAccountId: row.ad_account_id,
    campaignId: row.campaign_id,
    adSetId: row.ad_set_id,
    adId: row.ad_id,
    platform: row.platform,
    metricDate: row.metric_date,
    ageRange: row.age_range,
    gender: row.gender,
    impressions: numberValue(row.impressions),
    clicks: numberValue(row.clicks),
    linkClicks: numberValue(row.link_clicks),
    results: numberValue(row.results),
    spend: numberValue(row.spend)
  };
}

function mapFunnel(row: any): FunnelRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    category: row.category,
    isDefault: Boolean(row.is_default),
    isActive: Boolean(row.is_active)
  };
}

function mapFunnelStep(row: any): FunnelStepRecord {
  return {
    id: row.id,
    funnelId: row.funnel_id,
    stepKey: row.step_key,
    stepLabel: row.step_label,
    stepOrder: numberValue(row.step_order),
    sourceType: row.source_type,
    metricSource: row.metric_source,
    isActive: Boolean(row.is_active)
  };
}

function mapCampaign(row: any): CampaignRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    adAccountId: row.ad_account_id,
    platform: row.platform,
    externalId: row.external_id,
    name: row.name,
    objective: row.objective,
    status: row.status
  };
}

function mapCustomMetricDefinition(row: any): CustomMetricDefinitionRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    metricKey: row.metric_key,
    metricLabel: row.metric_label,
    description: row.description,
    dataType: row.data_type,
    isActive: Boolean(row.is_active)
  };
}

function mapCustomMetricValue(row: any): CustomMetricValueRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    campaignId: row.campaign_id,
    adSetId: row.ad_set_id,
    adId: row.ad_id,
    metricDefinitionId: row.metric_definition_id,
    metricDate: row.metric_date,
    metricValue: numberValue(row.metric_value)
  };
}

function mapSyncRun(row: any): SyncRunRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    platform: row.platform,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    insertedRows: numberValue(row.inserted_rows),
    errorMessage: row.error_message
  };
}

function resolveFilterDefaults(
  input: DashboardFilters,
  workspaceOptions: SelectOption[],
  preferredWorkspaceId?: string
) {
  const today = toISODate(new Date());
  return {
    workspaceId: input.workspaceId ?? preferredWorkspaceId ?? workspaceOptions[0]?.value ?? "",
    startDate: input.startDate ?? startDateFromDaysBack(DEFAULT_DATE_RANGE_DAYS),
    endDate: input.endDate ?? today,
    campaignId: input.campaignId ?? "",
    platform: input.platform ?? "all",
    funnelId: input.funnelId ?? ""
  } satisfies Required<DashboardFilters>;
}

function buildMockCampaignOptions(workspaceId: string) {
  return mockSnapshot.campaigns
    .filter((campaign) => campaign.workspaceId === workspaceId)
    .map((campaign) => ({ value: campaign.id, label: campaign.name }));
}

function filterRows<T extends { workspaceId: string; metricDate?: string; campaignId?: string | null; platform?: string }>(
  rows: T[],
  filters: Required<DashboardFilters>
) {
  return rows.filter((row) => {
    if (row.workspaceId !== filters.workspaceId) return false;

    if (row.metricDate) {
      if (row.metricDate < filters.startDate || row.metricDate > filters.endDate) return false;
    }

    if (filters.campaignId && row.campaignId && row.campaignId !== filters.campaignId) return false;
    if (filters.campaignId && row.campaignId === null) return false;
    if (filters.platform !== "all" && row.platform && row.platform !== filters.platform) return false;

    return true;
  });
}

async function getRealWorkspaces() {
  const supabase = getSupabaseOrThrow();

  const { data, error } = await supabase
    .from("workspaces")
    .select(SELECT_WORKSPACES)
    .order("name");

  if (error) {
    logQueryError("workspaces", error);
    throw error;
  }

  return (data ?? []) as Array<{ id: string; name: string }>;
}

async function getWorkspaceContext(): Promise<WorkspaceContext> {
  const workspaceOptions = mapWorkspaceOption(await getRealWorkspaces());
  const defaultWorkspaceIdFromEnv = process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID?.trim() ?? "";

  if (defaultWorkspaceIdFromEnv && workspaceOptions.some((item) => item.value === defaultWorkspaceIdFromEnv)) {
    return {
      workspaceOptions,
      preferredWorkspaceId: defaultWorkspaceIdFromEnv
    };
  }

  const preferredWorkspaceIdFromAccounts = await getPreferredWorkspaceIdFromAccounts(
    workspaceOptions.map((item) => item.value)
  );
  const preferredWorkspaceIdFromSync = await getPreferredWorkspaceIdFromSyncRuns(
    workspaceOptions.map((item) => item.value)
  );

  return {
    workspaceOptions,
    preferredWorkspaceId:
      preferredWorkspaceIdFromAccounts || preferredWorkspaceIdFromSync || workspaceOptions[0]?.value || ""
  };
}

function isLikelyDemoExternalId(value: string) {
  return /^(meta|google)-\d+$/i.test(value.trim());
}

async function getPreferredWorkspaceIdFromAccounts(workspaceIds: string[]) {
  if (workspaceIds.length === 0) return "";

  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("ad_accounts")
    .select("workspace_id, external_id, is_active")
    .in("workspace_id", workspaceIds)
    .eq("is_active", true);

  if (error) {
    logQueryError("workspace_preference_accounts", error, { workspaceIds });
    return "";
  }

  const scores = new Map<string, number>();

  for (const row of (data ?? []) as Array<{ workspace_id: string; external_id: string | null }>) {
    const workspaceId = row.workspace_id;
    const externalId = row.external_id?.trim() ?? "";
    if (!workspaceId || !externalId) continue;

    const currentScore = scores.get(workspaceId) ?? 0;
    scores.set(workspaceId, currentScore + (isLikelyDemoExternalId(externalId) ? 1 : 10));
  }

  return [...scores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

async function getPreferredWorkspaceIdFromSyncRuns(workspaceIds: string[]) {
  if (workspaceIds.length === 0) return "";

  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("sync_runs")
    .select("workspace_id, status, started_at, inserted_rows")
    .in("workspace_id", workspaceIds)
    .neq("status", "running")
    .order("started_at", { ascending: false })
    .limit(20);

  if (error) {
    logQueryError("workspace_preference_sync_runs", error, { workspaceIds });
    return workspaceIds[0] ?? "";
  }

  const preferred = (data ?? []).find((row: any) => {
    const startedAt = row.started_at ? String(row.started_at) : "";
    return Boolean(row.workspace_id) && Boolean(startedAt);
  });

  return preferred?.workspace_id ?? workspaceIds[0] ?? "";
}

async function getRealCampaigns(workspaceId: string) {
  const supabase = getSupabaseOrThrow();

  const { data, error } = await supabase
    .from("campaigns")
    .select(SELECT_CAMPAIGNS)
    .eq("workspace_id", workspaceId)
    .order("name");

  if (error) {
    logQueryError("campaigns", error, { workspaceId });
    throw error;
  }

  return (data ?? []).map(mapCampaign);
}

async function getRealFunnels(workspaceId: string) {
  const supabase = getSupabaseOrThrow();

  const { data: funnelData, error: funnelError } = await supabase
    .from("funnels")
    .select(SELECT_FUNNELS)
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("name");

  if (funnelError) {
    logQueryError("funnels", funnelError, { workspaceId });
    throw funnelError;
  }

  const funnels = (funnelData ?? []).map(mapFunnel);
  const funnelIds = funnels.map((item) => item.id);

  let steps: FunnelStepRecord[] = [];
  if (funnelIds.length) {
    const { data: stepData, error: stepError } = await supabase
      .from("funnel_steps")
      .select(SELECT_FUNNEL_STEPS)
      .in("funnel_id", funnelIds)
      .eq("is_active", true)
      .order("step_order");

    if (stepError) {
      logQueryError("funnel_steps", stepError, { workspaceId, funnelIds });
      throw stepError;
    }

    steps = (stepData ?? []).map(mapFunnelStep);
  }

  return funnels.map((funnel) => ({
    ...funnel,
    steps: steps.filter((step) => step.funnelId === funnel.id)
  }));
}

async function getRealDailyMetrics(filters: Required<DashboardFilters>) {
  const supabase = getSupabaseOrThrow();

  let query = supabase
    .from("daily_metrics")
    .select(SELECT_DAILY_METRICS)
    .eq("workspace_id", filters.workspaceId)
    .gte("metric_date", filters.startDate)
    .lte("metric_date", filters.endDate)
    .order("metric_date", { ascending: true });

  if (filters.campaignId) query = query.eq("campaign_id", filters.campaignId);
  if (filters.platform !== "all") query = query.eq("platform", filters.platform);

  const { data, error } = await query;

  if (error) {
    logQueryError("daily_metrics", error, filters);
    throw error;
  }

  return (data ?? []).map(mapDailyMetricRow);
}

async function getRealDemographics(filters: Required<DashboardFilters>) {
  const supabase = getSupabaseOrThrow();

  let query = supabase
    .from("demographic_metrics")
    .select(SELECT_DEMOGRAPHICS)
    .eq("workspace_id", filters.workspaceId)
    .gte("metric_date", filters.startDate)
    .lte("metric_date", filters.endDate)
    .order("metric_date", { ascending: true });

  if (filters.campaignId) query = query.eq("campaign_id", filters.campaignId);
  if (filters.platform !== "all") query = query.eq("platform", filters.platform);

  const { data, error } = await query;

  if (error) {
    logQueryError("demographic_metrics", error, filters);
    throw error;
  }

  return (data ?? []).map(mapDemographicRow);
}

async function getRealCustomMetrics(filters: Required<DashboardFilters>) {
  const supabase = getSupabaseOrThrow();

  const { data: definitionsData, error: definitionsError } = await supabase
    .from("custom_metric_definitions")
    .select(SELECT_CUSTOM_METRIC_DEFINITIONS)
    .eq("workspace_id", filters.workspaceId)
    .eq("is_active", true)
    .order("metric_label");

  if (definitionsError) {
    logQueryError("custom_metric_definitions", definitionsError, filters);
    throw definitionsError;
  }

  const definitions = (definitionsData ?? []).map(mapCustomMetricDefinition);
  const definitionIds = definitions.map((item) => item.id);

  if (!definitionIds.length) {
    return {
      definitions,
      values: [] as CustomMetricValueRecord[]
    };
  }

  let valuesQuery = supabase
    .from("custom_metric_values")
    .select(SELECT_CUSTOM_METRIC_VALUES)
    .eq("workspace_id", filters.workspaceId)
    .gte("metric_date", filters.startDate)
    .lte("metric_date", filters.endDate)
    .in("metric_definition_id", definitionIds)
    .order("metric_date", { ascending: true });

  if (filters.campaignId) valuesQuery = valuesQuery.eq("campaign_id", filters.campaignId);

  const { data: valuesData, error: valuesError } = await valuesQuery;

  if (valuesError) {
    logQueryError("custom_metric_values", valuesError, {
      ...filters,
      metricDefinitionIds: definitionIds
    });
    throw valuesError;
  }

  return {
    definitions,
    values: (valuesData ?? []).map(mapCustomMetricValue)
  };
}

async function getRealAdsByIds(adIds: string[]) {
  const supabase = getSupabaseOrThrow();
  if (!adIds.length) return [];

  const uniqueIds = [...new Set(adIds.filter(Boolean))];
  const byId = new Map<string, { id: string; name: string }>();

  for (const chunk of chunkArray(uniqueIds, IN_QUERY_CHUNK_SIZE)) {
    const { data, error } = await supabase.from("ads").select(SELECT_ADS).in("id", chunk);

    if (error) {
      logQueryError("ads", error, { adIdsCount: uniqueIds.length, chunkSize: chunk.length });
      throw error;
    }

    for (const row of (data ?? []) as Array<{ id: string; name: string }>) {
      byId.set(row.id, row);
    }
  }

  return [...byId.values()];
}

async function getRealCreativeRules(workspaceId: string) {
  const supabase = getSupabaseOrThrow();

  const { data, error } = await supabase
    .from("creative_frequency_rules")
    .select(SELECT_CREATIVE_RULES)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    logQueryError("creative_frequency_rules", error, { workspaceId });
    throw error;
  }

  return (
    data ?? {
      id: "default-rules",
      workspace_id: workspaceId,
      good_max: 6,
      attention_max: 10,
      replace_max: 15,
      critical_max: 18
    }
  );
}

async function getRealSyncRuns(workspaceId: string) {
  const supabase = getSupabaseOrThrow();

  const { data, error } = await supabase
    .from("sync_runs")
    .select(SELECT_SYNC_RUNS)
    .eq("workspace_id", workspaceId)
    .order("started_at", { ascending: false })
    .limit(8);

  if (error) {
    logQueryError("sync_runs", error, { workspaceId });
    throw error;
  }

  return (data ?? []).map(mapSyncRun);
}

async function getRealBudget(workspaceId: string) {
  const supabase = getSupabaseOrThrow();

  const { data: planData, error: planError } = await supabase
    .from("budget_plans")
    .select(SELECT_BUDGET_PLAN)
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (planError) {
    logQueryError("budget_plans", planError, { workspaceId });
    throw planError;
  }

  const plan = planData
    ? {
        id: planData.id,
        name: planData.name,
        totalBudget: numberValue(planData.total_budget),
        periodDays: numberValue(planData.period_days) || 30,
        startDate: planData.start_date,
        endDate: planData.end_date,
        notes: planData.notes
      }
    : null;

  const planId = planData?.id;

  const [{ data: channelsData, error: channelsError }, { data: objectivesData, error: objectivesError }, { data: benchmarkData, error: benchmarkError }] =
    await Promise.all([
      planId
        ? supabase.from("budget_channel_distribution").select(SELECT_BUDGET_CHANNELS).eq("budget_plan_id", planId)
        : Promise.resolve({ data: [], error: null }),
      planId
        ? supabase
            .from("budget_objective_distribution")
            .select(SELECT_BUDGET_OBJECTIVES)
            .eq("budget_plan_id", planId)
            .order("platform")
            .order("sort_order")
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("channel_benchmarks")
        .select(SELECT_BENCHMARKS)
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
    ]);

  if (channelsError) {
    logQueryError("budget_channel_distribution", channelsError, { workspaceId, planId });
    throw channelsError;
  }
  if (objectivesError) {
    logQueryError("budget_objective_distribution", objectivesError, { workspaceId, planId });
    throw objectivesError;
  }
  if (benchmarkError) {
    logQueryError("channel_benchmarks", benchmarkError, { workspaceId });
    throw benchmarkError;
  }

  const benchmarks = toBenchmarkRecord(
    (benchmarkData ?? []).map((item: any) => ({
      platform: item.platform,
      metricKey: item.metric_key,
      metricValue: numberValue(item.metric_value)
    }))
  );

  return buildBudgetState({
    workspaceId,
    plan,
    channels: (channelsData ?? []).map((item: any) => ({
      platform: item.platform,
      percentage: numberValue(item.percentage),
      amount: numberValue(item.amount)
    })),
    objectives: (objectivesData ?? []).map((item: any) => ({
      id: item.id,
      platform: item.platform,
      objective: item.objective,
      percentage: numberValue(item.percentage),
      periodDays: numberValue(item.period_days),
      dailyBudget: numberValue(item.daily_budget),
      totalBudget: numberValue(item.total_budget)
    })),
    benchmarks: {
      meta: benchmarks.meta ?? DEFAULT_BENCHMARKS.meta,
      google: benchmarks.google ?? DEFAULT_BENCHMARKS.google
    }
  });
}

function buildMockFunnels(workspaceId: string) {
  const funnels = mockSnapshot.funnels.filter((item) => item.workspaceId === workspaceId);
  return funnels.map((funnel) => ({
    ...funnel,
    steps: mockSnapshot.funnelSteps.filter((step) => step.funnelId === funnel.id && step.isActive)
  }));
}

async function getDashboardOverviewFromMock(filtersInput: DashboardFilters): Promise<DashboardOverviewData> {
  const workspaceOptions = mapWorkspaceOption(mockSnapshot.workspaces.map(({ id, name }) => ({ id, name })));
  const filters = resolveFilterDefaults(filtersInput, workspaceOptions);
  const funnels = buildMockFunnels(filters.workspaceId);
  const activeFunnelId = filters.funnelId || funnels.find((item) => item.isDefault)?.id || funnels[0]?.id || "";
  const resolvedFilters = { ...filters, funnelId: activeFunnelId };

  const dailyRows = filterRows(mockSnapshot.dailyMetrics, resolvedFilters);
  const demographicRows = filterRows(mockSnapshot.demographicMetrics, resolvedFilters);
  const campaigns = mockSnapshot.campaigns.filter((campaign) => campaign.workspaceId === resolvedFilters.workspaceId);
  const ads = mockSnapshot.ads.map((ad) => ({ id: ad.id, name: ad.name }));
  const creativeRules = mockSnapshot.creativeRules.find((item) => item.workspaceId === resolvedFilters.workspaceId);
  const { summary, rows } = buildCreativeHealth(dailyRows, campaigns, ads, creativeRules);
  const budgetPlan = buildBudgetState({
    workspaceId: resolvedFilters.workspaceId,
    plan: mockSnapshot.budgetPlans.find((plan) => plan.workspaceId === resolvedFilters.workspaceId)
      ? {
          id: mockSnapshot.budgetPlans[0].id,
          name: mockSnapshot.budgetPlans[0].name,
          totalBudget: mockSnapshot.budgetPlans[0].totalBudget,
          periodDays: mockSnapshot.budgetPlans[0].periodDays,
          startDate: mockSnapshot.budgetPlans[0].startDate,
          endDate: mockSnapshot.budgetPlans[0].endDate,
          notes: mockSnapshot.budgetPlans[0].notes
        }
      : null,
    channels: mockSnapshot.budgetChannels.map((item) => ({
      platform: item.platform,
      percentage: item.percentage,
      amount: item.amount
    })),
    objectives: mockSnapshot.budgetObjectives.map((item) => ({
      id: item.id,
      platform: item.platform,
      objective: item.objective,
      percentage: item.percentage,
      periodDays: item.periodDays,
      dailyBudget: item.dailyBudget,
      totalBudget: item.totalBudget
    })),
    benchmarks: toBenchmarkRecord(
      mockSnapshot.benchmarks
        .filter((item) => item.workspaceId === resolvedFilters.workspaceId)
        .map((item) => ({ platform: item.platform, metricKey: item.metricKey, metricValue: item.metricValue }))
    )
  });

  const budgetComparison = buildBudgetComparison(budgetPlan, dailyRows);
  const kpis = buildKpis(dailyRows);

  return {
    filters: resolvedFilters,
    workspaceOptions,
    campaignOptions: buildMockCampaignOptions(resolvedFilters.workspaceId),
    funnelOptions: funnels.map((item) => ({ value: item.id, label: item.name })),
    kpis,
    timeline: buildTimeline(dailyRows),
    funnel: buildFunnel(
      funnels.find((item) => item.id === resolvedFilters.funnelId) ?? null,
      dailyRows,
      mockSnapshot.customMetricDefinitions.filter((item) => item.workspaceId === resolvedFilters.workspaceId),
      filterRows(mockSnapshot.customMetricValues, resolvedFilters)
    ),
    demographics: buildDemographics(demographicRows),
    creativeSummary: summary,
    creativeRows: rows,
    alerts: buildAlerts({
      creativeSummary: summary,
      creativeRows: rows,
      kpis,
      syncRuns: mockSnapshot.syncRuns.filter((item) => item.workspaceId === resolvedFilters.workspaceId),
      budgetComparison
    }),
    performanceRows: buildPerformanceRows(dailyRows, campaigns)
  };
}

async function getBudgetOverviewFromMock(filtersInput: DashboardFilters): Promise<BudgetOverviewData> {
  const workspaceOptions = mapWorkspaceOption(mockSnapshot.workspaces.map(({ id, name }) => ({ id, name })));
  const filters = resolveFilterDefaults(filtersInput, workspaceOptions);
  const resolvedFilters = { ...filters, funnelId: "" };

  const campaignOptions = buildMockCampaignOptions(resolvedFilters.workspaceId);
  const plan = mockSnapshot.budgetPlans.find((item) => item.workspaceId === resolvedFilters.workspaceId) ?? null;
  const budgetPlan = buildBudgetState({
    workspaceId: resolvedFilters.workspaceId,
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          totalBudget: plan.totalBudget,
          periodDays: plan.periodDays,
          startDate: plan.startDate,
          endDate: plan.endDate,
          notes: plan.notes
        }
      : null,
    channels: mockSnapshot.budgetChannels.map((item) => ({
      platform: item.platform,
      percentage: item.percentage,
      amount: item.amount
    })),
    objectives: mockSnapshot.budgetObjectives.map((item) => ({
      id: item.id,
      platform: item.platform,
      objective: item.objective,
      percentage: item.percentage,
      periodDays: item.periodDays,
      dailyBudget: item.dailyBudget,
      totalBudget: item.totalBudget
    })),
    benchmarks: toBenchmarkRecord(
      mockSnapshot.benchmarks
        .filter((item) => item.workspaceId === resolvedFilters.workspaceId)
        .map((item) => ({ platform: item.platform, metricKey: item.metricKey, metricValue: item.metricValue }))
    )
  });

  const dailyRows = filterRows(mockSnapshot.dailyMetrics, resolvedFilters);

  return {
    filters: resolvedFilters,
    workspaceOptions,
    campaignOptions,
    budgetPlan,
    budgetComparison: buildBudgetComparison(budgetPlan, dailyRows)
  };
}

async function getControlOverviewFromMock(filtersInput: DashboardFilters): Promise<ControlOverviewData> {
  const workspaceOptions = mapWorkspaceOption(mockSnapshot.workspaces.map(({ id, name }) => ({ id, name })));
  const filters = resolveFilterDefaults(filtersInput, workspaceOptions);

  return {
    filters: { ...filters, funnelId: "" },
    workspaceOptions,
    syncRuns: mockSnapshot.syncRuns.filter((item) => item.workspaceId === filters.workspaceId),
    creativeRules:
      mockSnapshot.creativeRules.find((item) => item.workspaceId === filters.workspaceId) ?? {
        id: "default",
        workspaceId: filters.workspaceId,
        goodMax: 6,
        attentionMax: 10,
        replaceMax: 15,
        criticalMax: 18
      },
    funnels: buildMockFunnels(filters.workspaceId),
    customMetrics: mockSnapshot.customMetricDefinitions.filter((item) => item.workspaceId === filters.workspaceId)
  };
}

async function getDashboardOverviewFromSupabase(filtersInput: DashboardFilters): Promise<DashboardOverviewData> {
  const { workspaceOptions, preferredWorkspaceId } = await getWorkspaceContext();
  const filters = resolveFilterDefaults(filtersInput, workspaceOptions, preferredWorkspaceId);

  if (!filters.workspaceId) {
    throw new Error("Nenhum workspace ativo encontrado no Supabase.");
  }

  const campaigns = await getRealCampaigns(filters.workspaceId);
  const funnels = await getRealFunnels(filters.workspaceId);
  const activeFunnelId = filters.funnelId || funnels.find((item) => item.isDefault)?.id || funnels[0]?.id || "";
  const resolvedFilters = { ...filters, funnelId: activeFunnelId };

  const [dailyRows, demographicRows, customMetrics, creativeRulesRow, syncRuns, budgetPlan] = await Promise.all([
    getRealDailyMetrics(resolvedFilters),
    getRealDemographics(resolvedFilters),
    getRealCustomMetrics(resolvedFilters),
    getRealCreativeRules(resolvedFilters.workspaceId),
    getRealSyncRuns(resolvedFilters.workspaceId),
    getRealBudget(resolvedFilters.workspaceId)
  ]);

  const adIds = [...new Set(dailyRows.map((row) => row.adId).filter(Boolean) as string[])];
  const ads = await getRealAdsByIds(adIds);

  const creativeRules = {
    id: creativeRulesRow.id,
    workspaceId: creativeRulesRow.workspace_id,
    goodMax: numberValue(creativeRulesRow.good_max) || 6,
    attentionMax: numberValue(creativeRulesRow.attention_max) || 10,
    replaceMax: numberValue(creativeRulesRow.replace_max) || 15,
    criticalMax: numberValue(creativeRulesRow.critical_max) || 18
  };

  const { summary, rows } = buildCreativeHealth(dailyRows, campaigns, ads, creativeRules);
  const budgetComparison = buildBudgetComparison(budgetPlan, dailyRows);
  const kpis = buildKpis(dailyRows);

  return {
    filters: resolvedFilters,
    workspaceOptions,
    campaignOptions: campaigns.map((item) => ({ value: item.id, label: item.name })),
    funnelOptions: funnels.map((item) => ({ value: item.id, label: item.name })),
    kpis,
    timeline: buildTimeline(dailyRows),
    funnel: buildFunnel(
      funnels.find((item) => item.id === resolvedFilters.funnelId) ?? null,
      dailyRows,
      customMetrics.definitions,
      customMetrics.values
    ),
    demographics: buildDemographics(demographicRows),
    creativeSummary: summary,
    creativeRows: rows,
    alerts: buildAlerts({
      creativeSummary: summary,
      creativeRows: rows,
      kpis,
      syncRuns,
      budgetComparison
    }),
    performanceRows: buildPerformanceRows(dailyRows, campaigns)
  };
}

async function getBudgetOverviewFromSupabase(filtersInput: DashboardFilters): Promise<BudgetOverviewData> {
  const { workspaceOptions, preferredWorkspaceId } = await getWorkspaceContext();
  const filters = resolveFilterDefaults(filtersInput, workspaceOptions, preferredWorkspaceId);

  if (!filters.workspaceId) {
    throw new Error("Nenhum workspace ativo encontrado no Supabase.");
  }

  const resolvedFilters = { ...filters, funnelId: "" };

  const [campaigns, budgetPlan, dailyRows] = await Promise.all([
    getRealCampaigns(resolvedFilters.workspaceId),
    getRealBudget(resolvedFilters.workspaceId),
    getRealDailyMetrics(resolvedFilters)
  ]);

  return {
    filters: resolvedFilters,
    workspaceOptions,
    campaignOptions: campaigns.map((item) => ({ value: item.id, label: item.name })),
    budgetPlan,
    budgetComparison: buildBudgetComparison(budgetPlan, dailyRows)
  };
}

async function getControlOverviewFromSupabase(filtersInput: DashboardFilters): Promise<ControlOverviewData> {
  const { workspaceOptions, preferredWorkspaceId } = await getWorkspaceContext();
  const filters = resolveFilterDefaults(filtersInput, workspaceOptions, preferredWorkspaceId);

  if (!filters.workspaceId) {
    throw new Error("Nenhum workspace ativo encontrado no Supabase.");
  }

  const [syncRuns, creativeRulesRow, funnels, customMetrics] = await Promise.all([
    getRealSyncRuns(filters.workspaceId),
    getRealCreativeRules(filters.workspaceId),
    getRealFunnels(filters.workspaceId),
    getRealCustomMetrics(filters)
  ]);

  return {
    filters: { ...filters, funnelId: "" },
    workspaceOptions,
    syncRuns,
    creativeRules: {
      id: creativeRulesRow.id,
      workspaceId: creativeRulesRow.workspace_id,
      goodMax: numberValue(creativeRulesRow.good_max) || 6,
      attentionMax: numberValue(creativeRulesRow.attention_max) || 10,
      replaceMax: numberValue(creativeRulesRow.replace_max) || 15,
      criticalMax: numberValue(creativeRulesRow.critical_max) || 18
    },
    funnels,
    customMetrics: customMetrics.definitions
  };
}

export async function getDashboardOverview(filtersInput: DashboardFilters): Promise<DashboardOverviewData> {
  if (shouldUseMocks()) {
    return getDashboardOverviewFromMock(filtersInput);
  }

  try {
    return await getDashboardOverviewFromSupabase(filtersInput);
  } catch (error) {
    logQueryError("overview", error, { filtersInput });
    throw error;
  }
}

export async function getBudgetOverview(filtersInput: DashboardFilters): Promise<BudgetOverviewData> {
  if (shouldUseMocks()) {
    return getBudgetOverviewFromMock(filtersInput);
  }

  try {
    return await getBudgetOverviewFromSupabase(filtersInput);
  } catch (error) {
    logQueryError("budget_overview", error, { filtersInput });
    throw error;
  }
}

export async function getControlOverview(filtersInput: DashboardFilters): Promise<ControlOverviewData> {
  if (shouldUseMocks()) {
    return getControlOverviewFromMock(filtersInput);
  }

  try {
    return await getControlOverviewFromSupabase(filtersInput);
  } catch (error) {
    logQueryError("control_overview", error, { filtersInput });
    throw error;
  }
}

export function recomputeBudgetState(input: BudgetOverviewData["budgetPlan"]) {
  const channels = normalizeChannels(input.totalBudget, input.channels);
  const objectives = normalizeObjectives(input.periodDays, channels, input.objectives);

  return buildBudgetState({
    workspaceId: input.workspaceId,
    plan: input.id
      ? {
          id: input.id,
          name: input.name,
          totalBudget: input.totalBudget,
          periodDays: input.periodDays,
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
          notes: input.notes ?? null
        }
      : null,
    channels,
    objectives,
    benchmarks: input.benchmarks
  });
}
