import { DEFAULT_BENCHMARKS, DEFAULT_CREATIVE_RULES } from "./constants";
import { formatCurrency, formatPercent, percentageChange } from "./utils";
import type {
  AlertItem,
  BenchmarkValues,
  BudgetComparisonRow,
  BudgetPlannerState,
  CampaignRecord,
  ChannelDistributionState,
  CreativeHealthRow,
  CreativeHealthStatus,
  DailyMetricRecord,
  DemographicMetricRecord,
  EstimateMetric,
  FunnelRecord,
  FunnelResult,
  FunnelStepRecord,
  KpiMetrics,
  PerformanceRow,
  PlatformType,
  CustomMetricDefinitionRecord,
  CustomMetricValueRecord,
  CreativeRuleRecord,
  CreativeHealthSummary,
  TimelinePoint
} from "./types";

const metricAccessor: Record<string, (row: DailyMetricRecord) => number> = {
  impressions: (row) => row.impressions,
  reach: (row) => row.reach,
  clicks: (row) => row.clicks,
  link_clicks: (row) => row.linkClicks,
  landing_page_views: (row) => row.landingPageViews,
  messages_started: (row) => row.messagesStarted,
  engagements: (row) => row.engagements,
  leads: (row) => row.leads,
  checkouts: (row) => row.checkouts,
  purchases: (row) => row.purchases,
  results: (row) => row.results,
  spend: (row) => row.spend,
  revenue: (row) => row.revenue,
  video_views_25: (row) => row.videoViews25,
  video_views_50: (row) => row.videoViews50,
  video_views_75: (row) => row.videoViews75,
  video_views_100: (row) => row.videoViews100
};

function resolvePrimaryAcquisitions(
  leads: number,
  messagesStarted: number,
  results: number,
  purchases: number
) {
  const directAcquisitions = leads + messagesStarted;
  if (directAcquisitions > 0) return directAcquisitions;
  if (purchases > 0) return purchases;
  return results;
}

function formatRoas(value: number) {
  return `${value.toFixed(2).replace(".", ",")}x`;
}

export function buildKpis(rows: DailyMetricRecord[]): KpiMetrics {
  const investment = rows.reduce((sum, row) => sum + row.spend, 0);
  const results = rows.reduce((sum, row) => sum + row.results, 0);
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const linkClicks = rows.reduce((sum, row) => sum + row.linkClicks, 0);
  const leads = rows.reduce((sum, row) => sum + row.leads, 0);
  const messagesStarted = rows.reduce((sum, row) => sum + row.messagesStarted, 0);
  const purchases = rows.reduce((sum, row) => sum + row.purchases, 0);

  const primaryAcquisitions = resolvePrimaryAcquisitions(
    leads,
    messagesStarted,
    results,
    purchases
  );

  const resultLabel =
    rows.find((row) => row.resultLabel && row.resultLabel.trim())?.resultLabel ?? "Resultado";

  return {
    investment,
    results,
    resultLabel,
    costPerResult: results ? investment / results : 0,
    revenue,
    ctr: impressions ? (clicks / impressions) * 100 : 0,
    cpm: impressions ? (investment / impressions) * 1000 : 0,
    cpc: clicks ? investment / clicks : 0,
    cpa: primaryAcquisitions ? investment / primaryAcquisitions : 0,
    roas: investment ? revenue / investment : 0,
    conversionRate: clicks ? (primaryAcquisitions / clicks) * 100 : 0,
    primaryAcquisitions,
    impressions,
    clicks,
    linkClicks,
    leads,
    messagesStarted,
    purchases
  };
}

export function buildTimeline(rows: DailyMetricRecord[]): TimelinePoint[] {
  const grouped = new Map<string, TimelinePoint>();

  for (const row of rows) {
    const current = grouped.get(row.metricDate) ?? {
      date: row.metricDate,
      spend: 0,
      results: 0
    };
    current.spend += row.spend;
    current.results += row.results;
    grouped.set(row.metricDate, current);
  }

  return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function buildDemographics(rows: DemographicMetricRecord[]) {
  const grouped = new Map<string, number>();

  for (const row of rows) {
    grouped.set(row.ageRange, (grouped.get(row.ageRange) ?? 0) + row.impressions);
  }

  return [...grouped.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function sumRowsMetric(rows: DailyMetricRecord[], metricKey: string) {
  const accessor = metricAccessor[metricKey];
  if (!accessor) return 0;
  return rows.reduce((sum, row) => sum + accessor(row), 0);
}

function buildCustomMetricMap(
  definitions: CustomMetricDefinitionRecord[],
  values: CustomMetricValueRecord[]
) {
  const definitionById = new Map(definitions.map((item) => [item.id, item]));
  const totals = new Map<string, number>();

  for (const value of values) {
    const definition = definitionById.get(value.metricDefinitionId);
    if (!definition) continue;
    totals.set(definition.metricKey, (totals.get(definition.metricKey) ?? 0) + value.metricValue);
  }

  return totals;
}

export function buildExecutiveFunnel(rows: DailyMetricRecord[]): FunnelResult {
  const kpis = buildKpis(rows);

  const finalLabel =
    kpis.messagesStarted > 0 && kpis.leads > 0
      ? "Conversas / Inscrições"
      : kpis.messagesStarted > 0
      ? "Conversas"
      : kpis.leads > 0
      ? "Inscrições"
      : kpis.purchases > 0
      ? "Vendas"
      : kpis.resultLabel || "Resultado";

  return {
    id: "executive-funnel",
    name: "Funil",
    category: "executivo",
    steps: [
      {
        id: "investment",
        label: "Investimento",
        value: kpis.investment,
        valueType: "currency",
        rateFromPrevious: null,
        helperText: kpis.roas > 0 ? `ROAS ${formatRoas(kpis.roas)}` : "Base do período"
      },
      {
        id: "impressions",
        label: "Impressões",
        value: kpis.impressions,
        valueType: "number",
        rateFromPrevious: null,
        helperText: `CPM ${formatCurrency(kpis.cpm)}`
      },
      {
        id: "clicks",
        label: "Cliques",
        value: kpis.clicks,
        valueType: "number",
        rateFromPrevious: kpis.impressions > 0 ? (kpis.clicks / kpis.impressions) * 100 : 0,
        helperText: `CTR ${formatPercent(kpis.ctr)}`
      },
      {
        id: "link-clicks",
        label: "Cliques no link",
        value: kpis.linkClicks,
        valueType: "number",
        rateFromPrevious: kpis.clicks > 0 ? (kpis.linkClicks / kpis.clicks) * 100 : 0,
        helperText: `CPC ${formatCurrency(kpis.cpc)}`
      },
      {
        id: "acquisitions",
        label: finalLabel,
        value: kpis.primaryAcquisitions,
        valueType: "number",
        rateFromPrevious:
          kpis.linkClicks > 0 ? (kpis.primaryAcquisitions / kpis.linkClicks) * 100 : 0,
        helperText: `Tx conversão ${formatPercent(kpis.conversionRate)}`
      }
    ]
  };
}

export function buildFunnel(
  funnel: (FunnelRecord & { steps: FunnelStepRecord[] }) | null,
  rows: DailyMetricRecord[],
  customDefinitions: CustomMetricDefinitionRecord[],
  customValues: CustomMetricValueRecord[]
): FunnelResult | null {
  if (!funnel) return null;

  const customMap = buildCustomMetricMap(customDefinitions, customValues);
  let previousValue: number | null = null;

  const steps = [...funnel.steps]
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .map((step) => {
      const value =
        step.sourceType === "custom"
          ? customMap.get(step.metricSource) ?? 0
          : sumRowsMetric(rows, step.metricSource);

      const rateFromPrevious =
        previousValue === null ? null : previousValue > 0 ? (value / previousValue) * 100 : 0;

      previousValue = value;

      return {
        id: step.id,
        label: step.stepLabel,
        value,
        rateFromPrevious
      };
    });

  return {
    id: funnel.id,
    name: funnel.name,
    category: funnel.category,
    steps
  };
}

function classifyCreativeHealth(args: {
  frequency: number;
  ctrTrend: number;
  costTrend: number;
  rules?: CreativeRuleRecord;
}) {
  const rules = args.rules ?? {
    id: "default",
    workspaceId: "default",
    ...DEFAULT_CREATIVE_RULES
  };

  const { frequency, ctrTrend, costTrend } = args;

  if (frequency >= rules.criticalMax || (frequency >= rules.replaceMax && ctrTrend <= -15 && costTrend >= 20)) {
    return {
      status: "critical" as CreativeHealthStatus,
      recommendation: "Saturação evidente. Trocar a peça e revisar ângulo/copy."
    };
  }

  if (frequency >= rules.replaceMax || (frequency >= rules.attentionMax && ctrTrend <= -8 && costTrend >= 10)) {
    return {
      status: "replace" as CreativeHealthStatus,
      recommendation: "Frequência alta com perda de eficiência. Substituir o criativo."
    };
  }

  if (frequency >= rules.attentionMax || ctrTrend <= -5 || costTrend >= 6) {
    return {
      status: "warning" as CreativeHealthStatus,
      recommendation: "Criativo pedindo atenção. Monitorar e preparar nova variação."
    };
  }

  return {
    status: "good" as CreativeHealthStatus,
    recommendation: "Frequência controlada e performance sustentável. Pode manter."
  };
}

export function buildCreativeHealth(
  rows: DailyMetricRecord[],
  campaigns: CampaignRecord[],
  ads: Array<{ id: string; name: string }>,
  rules?: CreativeRuleRecord
): { summary: CreativeHealthSummary; rows: CreativeHealthRow[] } {
  const grouped = new Map<string, DailyMetricRecord[]>();
  const campaignMap = new Map(campaigns.map((item) => [item.id, item.name]));
  const adMap = new Map(ads.map((item) => [item.id, item.name]));

  const resolveGroupKey = (row: DailyMetricRecord) => {
    if (row.adId) return `ad:${row.adId}`;
    if (row.adSetId) return `adset:${row.adSetId}`;
    if (row.campaignId) return `campaign:${row.campaignId}`;
    return `platform:${row.platform}`;
  };

  const resolveEntityId = (row: DailyMetricRecord) => row.adId || row.adSetId || row.campaignId || row.platform;

  const resolveEntityName = (row: DailyMetricRecord) => {
    if (row.adId) return adMap.get(row.adId) ?? `Criativo ${row.adId.slice(0, 8)}`;
    if (row.adSetId) return `Conjunto ${row.adSetId.slice(0, 8)}`;
    if (row.campaignId) return campaignMap.get(row.campaignId) ?? `Campanha ${row.platform}`;
    return row.platform === "meta" ? "Meta Ads" : "Google Ads";
  };

  for (const row of rows) {
    const key = resolveGroupKey(row);
    const current = grouped.get(key) ?? [];
    current.push(row);
    grouped.set(key, current);
  }

  const healthRows: CreativeHealthRow[] = [...grouped.entries()].map(([groupKey, items]) => {
    const entityId = resolveEntityId(items[0]);
    const sorted = [...items].sort((a, b) => a.metricDate.localeCompare(b.metricDate));
    const splitIndex = Math.max(sorted.length - 7, 0);
    const currentWindow = sorted.slice(splitIndex);
    const previousWindow = sorted.slice(Math.max(splitIndex - 7, 0), splitIndex);

    const aggregate = (windowRows: DailyMetricRecord[]) => {
      const impressions = windowRows.reduce((sum, row) => sum + row.impressions, 0);
      const reach = windowRows.reduce((sum, row) => sum + row.reach, 0);
      const clicks = windowRows.reduce((sum, row) => sum + row.clicks, 0);
      const spend = windowRows.reduce((sum, row) => sum + row.spend, 0);
      const results = windowRows.reduce((sum, row) => sum + row.results, 0);

      return {
        impressions,
        reach,
        spend,
        results,
        frequency: reach ? impressions / reach : 0,
        ctr: impressions ? (clicks / impressions) * 100 : 0,
        costPerResult: results ? spend / results : 0
      };
    };

    const total = aggregate(sorted);
    const current = aggregate(currentWindow);
    const previous = aggregate(previousWindow);

    const frequencyTrend = percentageChange(current.frequency, previous.frequency);
    const ctrTrend = percentageChange(current.ctr, previous.ctr);
    const costTrend = percentageChange(current.costPerResult, previous.costPerResult);

    const classification = classifyCreativeHealth({
      frequency: total.frequency,
      ctrTrend,
      costTrend,
      rules
    });

    return {
      adId: entityId,
      adName: resolveEntityName(sorted[0]),
      campaignName: campaignMap.get(sorted[0]?.campaignId ?? "") ?? (sorted[0]?.platform === "meta" ? "Meta Ads" : "Google Ads"),
      platform: sorted[0]?.platform ?? "meta",
      frequency: total.frequency,
      ctr: total.ctr,
      costPerResult: total.costPerResult,
      spend: total.spend,
      results: total.results,
      frequencyTrend,
      ctrTrend,
      costTrend,
      status: classification.status,
      recommendation: classification.recommendation
    };
  });

  healthRows.sort((a, b) => {
    const priority: Record<CreativeHealthStatus, number> = {
      critical: 0,
      replace: 1,
      warning: 2,
      good: 3
    };

    if (priority[a.status] !== priority[b.status]) {
      return priority[a.status] - priority[b.status];
    }

    return b.frequency - a.frequency;
  });

  const summary = healthRows.reduce<CreativeHealthSummary>(
    (accumulator, row) => {
      accumulator[row.status] += 1;
      return accumulator;
    },
    { good: 0, warning: 0, replace: 0, critical: 0 }
  );

  return { summary, rows: healthRows };
}

export function buildPerformanceRows(rows: DailyMetricRecord[], campaigns: CampaignRecord[]): PerformanceRow[] {
  const grouped = new Map<string, PerformanceRow>();
  const campaignMap = new Map(campaigns.map((item) => [item.id, item.name]));

  for (const row of rows) {
    const key = row.campaignId ?? row.platform;
    const current = grouped.get(key) ?? {
      key,
      campaignName: campaignMap.get(row.campaignId ?? "") ?? `Campanha ${row.platform}`,
      platform: row.platform,
      clicks: 0,
      results: 0,
      ctr: 0,
      spend: 0,
      costPerResult: 0,
      revenue: 0
    };

    current.clicks += row.clicks;
    current.results += row.results;
    current.spend += row.spend;
    current.revenue += row.revenue;
    current.ctr += row.ctr * row.impressions;
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .map((row) => {
      const sourceRows = rows.filter((item) => (item.campaignId ?? item.platform) === row.key);
      const impressions = sourceRows.reduce((sum, item) => sum + item.impressions, 0);
      return {
        ...row,
        ctr: impressions ? row.ctr / impressions : 0,
        costPerResult: row.results ? row.spend / row.results : 0
      };
    })
    .sort((a, b) => b.spend - a.spend);
}

export function buildBudgetEstimates(input: {
  totalBudget: number;
  periodDays: number;
  channels: ChannelDistributionState[];
  benchmarks: Record<PlatformType, BenchmarkValues>;
}) {
  const estimates = {
    meta: [] as EstimateMetric[],
    google: [] as EstimateMetric[]
  };

  for (const channel of input.channels) {
    const benchmark = input.benchmarks[channel.platform] ?? DEFAULT_BENCHMARKS[channel.platform];
    const totalBudget = channel.amount;
    const periodDays = input.periodDays || 1;

    const metrics: EstimateMetric[] = [
      {
        metricKey: "impressions",
        metricLabel: "Impressões",
        totalResult: benchmark.cpm ? (totalBudget / benchmark.cpm) * 1000 : 0,
        dailyResult: benchmark.cpm ? ((totalBudget / benchmark.cpm) * 1000) / periodDays : 0
      },
      {
        metricKey: "visits",
        metricLabel: "Visitas",
        totalResult: benchmark.costPerVisit ? totalBudget / benchmark.costPerVisit : 0,
        dailyResult: benchmark.costPerVisit ? totalBudget / benchmark.costPerVisit / periodDays : 0
      },
      {
        metricKey: "engagements",
        metricLabel: "Engajamentos",
        totalResult: benchmark.costPerEngagement ? totalBudget / benchmark.costPerEngagement : 0,
        dailyResult: benchmark.costPerEngagement
          ? totalBudget / benchmark.costPerEngagement / periodDays
          : 0
      },
      {
        metricKey: "leads",
        metricLabel: "Leads",
        totalResult: benchmark.costPerLead ? totalBudget / benchmark.costPerLead : 0,
        dailyResult: benchmark.costPerLead ? totalBudget / benchmark.costPerLead / periodDays : 0
      },
      {
        metricKey: "sales",
        metricLabel: "Vendas",
        totalResult: benchmark.costPerSale ? totalBudget / benchmark.costPerSale : 0,
        dailyResult: benchmark.costPerSale ? totalBudget / benchmark.costPerSale / periodDays : 0
      }
    ];

    estimates[channel.platform] = metrics;
  }

  return estimates;
}

export function normalizeChannels(totalBudget: number, channels: ChannelDistributionState[]) {
  const next = channels.map((channel) => ({
    ...channel,
    percentage: Number(channel.percentage) || 0
  }));

  const totalPercentage = next.reduce((sum, channel) => sum + channel.percentage, 0);
  const safeTotal = totalPercentage || 100;

  return next.map((channel) => ({
    ...channel,
    amount: (totalBudget * channel.percentage) / safeTotal
  }));
}

export function normalizeObjectives(
  periodDays: number,
  channels: ChannelDistributionState[],
  objectives: BudgetPlannerState["objectives"]
) {
  const channelBudgetByPlatform = new Map(channels.map((channel) => [channel.platform, channel.amount]));

  return objectives.map((objective) => {
    const platformBudget = channelBudgetByPlatform.get(objective.platform) ?? 0;
    const totalBudget = (platformBudget * objective.percentage) / 100;

    return {
      ...objective,
      periodDays,
      totalBudget,
      dailyBudget: periodDays ? totalBudget / periodDays : 0
    };
  });
}

export function buildBudgetComparison(
  budgetPlan: BudgetPlannerState,
  rows: DailyMetricRecord[]
): BudgetComparisonRow[] {
  const realizedByPlatform = new Map<
    PlatformType,
    {
      spend: number;
      results: number;
    }
  >();

  for (const row of rows) {
    const current = realizedByPlatform.get(row.platform) ?? { spend: 0, results: 0 };
    current.spend += row.spend;
    current.results += row.results;
    realizedByPlatform.set(row.platform, current);
  }

  const estimatedByPlatform = new Map(
    Object.entries(budgetPlan.estimates).map(([platform, metrics]) => {
      const leadsMetric = metrics.find((metric) => metric.metricKey === "leads");
      return [platform as PlatformType, leadsMetric?.totalResult ?? 0];
    })
  );

  return budgetPlan.channels.map((channel) => ({
    platform: channel.platform,
    plannedBudget: channel.amount,
    realizedBudget: realizedByPlatform.get(channel.platform)?.spend ?? 0,
    plannedResults: estimatedByPlatform.get(channel.platform) ?? 0,
    realizedResults: realizedByPlatform.get(channel.platform)?.results ?? 0
  }));
}

export function buildAlerts(args: {
  creativeSummary: CreativeHealthSummary;
  creativeRows: CreativeHealthRow[];
  kpis: KpiMetrics;
  syncRuns?: Array<{ platform: PlatformType; status: string; errorMessage?: string | null }>;
  budgetComparison?: BudgetComparisonRow[];
}) {
  const alerts: AlertItem[] = [];

  if (args.creativeSummary.replace + args.creativeSummary.critical > 0) {
    alerts.push({
      id: "creative-fatigue",
      severity: "critical",
      title: "Criativos pedindo troca",
      description: `${args.creativeSummary.replace + args.creativeSummary.critical} criativos já mostram saturação ou desgaste claro.`
    });
  }

  if (args.creativeSummary.warning > 0) {
    alerts.push({
      id: "creative-warning",
      severity: "warning",
      title: "Frequência em atenção",
      description: `${args.creativeSummary.warning} criativos estão começando a cansar e pedem monitoramento.`
    });
  }

  const topCritical = args.creativeRows.find((row) => row.status === "critical");
  if (topCritical) {
    alerts.push({
      id: "critical-creative-detail",
      severity: "critical",
      title: `Trocar ${topCritical.adName}`,
      description: `${topCritical.campaignName}: frequência ${topCritical.frequency.toFixed(1)} com piora de CTR/custo.`
    });
  }

  if (args.syncRuns?.some((run) => run.status === "error")) {
    const failed = args.syncRuns.find((run) => run.status === "error");
    alerts.push({
      id: "sync-error",
      severity: "warning",
      title: "Falha de sincronização",
      description: failed?.errorMessage ?? "Existe pelo menos uma sincronização com erro."
    });
  }

  if (args.budgetComparison?.some((row) => row.realizedBudget > row.plannedBudget * 1.1)) {
    const over = args.budgetComparison.find((row) => row.realizedBudget > row.plannedBudget * 1.1);
    if (over) {
      alerts.push({
        id: "budget-overrun",
        severity: "warning",
        title: `${over.platform === "meta" ? "Meta" : "Google"} acima do planejado`,
        description: "O realizado já passou 10% do orçamento previsto para o canal."
      });
    }
  }

  if (!alerts.length) {
    alerts.push({
      id: "no-alerts",
      severity: "info",
      title: "Operação estável",
      description: "Sem alertas críticos no período selecionado."
    });
  }

  return alerts.slice(0, 4);
}

export function toBenchmarkRecord(
  rows: Array<{ platform: PlatformType; metricKey: string; metricValue: number }>
): Record<PlatformType, BenchmarkValues> {
  const base: Record<PlatformType, BenchmarkValues> = {
    meta: { ...DEFAULT_BENCHMARKS.meta },
    google: { ...DEFAULT_BENCHMARKS.google }
  };

  for (const row of rows) {
    switch (row.metricKey) {
      case "cpm":
        base[row.platform].cpm = row.metricValue;
        break;
      case "cost_per_visit":
        base[row.platform].costPerVisit = row.metricValue;
        break;
      case "cost_per_engagement":
        base[row.platform].costPerEngagement = row.metricValue;
        break;
      case "cost_per_lead":
        base[row.platform].costPerLead = row.metricValue;
        break;
      case "cost_per_sale":
        base[row.platform].costPerSale = row.metricValue;
        break;
      default:
        break;
    }
  }

  return base;
}

export function buildBudgetState(args: {
  workspaceId: string;
  plan?: {
    id: string;
    name: string;
    totalBudget: number;
    periodDays: number;
    startDate: string | null;
    endDate: string | null;
    notes: string | null;
  } | null;
  channels: Array<{ platform: PlatformType; percentage: number; amount: number }>;
  objectives: Array<{
    id: string;
    platform: PlatformType;
    objective: string;
    percentage: number;
    periodDays: number;
    dailyBudget: number;
    totalBudget: number;
  }>;
  benchmarks: Record<PlatformType, BenchmarkValues>;
}) {
  const totalBudget =
    args.plan?.totalBudget ??
    (args.channels.reduce((sum, channel) => sum + channel.amount, 0) || 30000);

  const periodDays = args.plan?.periodDays ?? 30;

  const channels =
    args.channels.length > 0
      ? args.channels
      : normalizeChannels(totalBudget, [
          { platform: "meta", percentage: 67, amount: 0 },
          { platform: "google", percentage: 33, amount: 0 }
        ]);

  const objectives =
    args.objectives.length > 0
      ? args.objectives
      : normalizeObjectives(periodDays, channels, [
          {
            id: "meta-1",
            platform: "meta",
            objective: "Reconhecimento",
            percentage: 15,
            periodDays,
            dailyBudget: 0,
            totalBudget: 0
          },
          {
            id: "meta-2",
            platform: "meta",
            objective: "Tráfego",
            percentage: 20,
            periodDays,
            dailyBudget: 0,
            totalBudget: 0
          },
          {
            id: "meta-3",
            platform: "meta",
            objective: "Engajamento",
            percentage: 15,
            periodDays,
            dailyBudget: 0,
            totalBudget: 0
          },
          {
            id: "meta-4",
            platform: "meta",
            objective: "Cadastros",
            percentage: 20,
            periodDays,
            dailyBudget: 0,
            totalBudget: 0
          },
          {
            id: "meta-5",
            platform: "meta",
            objective: "Vendas",
            percentage: 30,
            periodDays,
            dailyBudget: 0,
            totalBudget: 0
          },
          {
            id: "google-1",
            platform: "google",
            objective: "Reconhecimento",
            percentage: 10,
            periodDays,
            dailyBudget: 0,
            totalBudget: 0
          },
          {
            id: "google-2",
            platform: "google",
            objective: "Tráfego",
            percentage: 30,
            periodDays,
            dailyBudget: 0,
            totalBudget: 0
          },
          {
            id: "google-3",
            platform: "google",
            objective: "Engajamento",
            percentage: 10,
            periodDays,
            dailyBudget: 0,
            totalBudget: 0
          },
          {
            id: "google-4",
            platform: "google",
            objective: "Cadastros",
            percentage: 20,
            periodDays,
            dailyBudget: 0,
            totalBudget: 0
          },
          {
            id: "google-5",
            platform: "google",
            objective: "Vendas",
            percentage: 30,
            periodDays,
            dailyBudget: 0,
            totalBudget: 0
          }
        ]);

  const estimates = buildBudgetEstimates({
    totalBudget,
    periodDays,
    channels,
    benchmarks: args.benchmarks
  });

  return {
    id: args.plan?.id,
    workspaceId: args.workspaceId,
    name: args.plan?.name ?? "Plano de verba",
    totalBudget,
    periodDays,
    startDate: args.plan?.startDate ?? undefined,
    endDate: args.plan?.endDate ?? undefined,
    notes: args.plan?.notes ?? undefined,
    channels,
    objectives,
    benchmarks: args.benchmarks,
    estimates
  };
}
