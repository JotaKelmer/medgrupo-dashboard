export type PlatformType = "meta" | "google";
export type FilterPlatform = PlatformType | "all";
export type MetricSourceType = "standard" | "custom";

export type StandardMetricKey =
  | "impressions"
  | "reach"
  | "clicks"
  | "link_clicks"
  | "landing_page_views"
  | "messages_started"
  | "engagements"
  | "leads"
  | "checkouts"
  | "purchases"
  | "results"
  | "spend"
  | "revenue"
  | "video_views_25"
  | "video_views_50"
  | "video_views_75"
  | "video_views_100";

export type DashboardFilters = {
  workspaceId?: string;
  startDate?: string;
  endDate?: string;
  campaignId?: string;
  platform?: FilterPlatform;
  funnelId?: string;
};

export type WorkspaceRecord = {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  timezone: string;
  isActive: boolean;
};

export type AdAccountRecord = {
  id: string;
  workspaceId: string;
  platform: PlatformType;
  externalId: string;
  name: string;
  currency: string;
  timezone: string;
  isActive: boolean;
};

export type CampaignRecord = {
  id: string;
  workspaceId: string;
  adAccountId: string;
  platform: PlatformType;
  externalId: string;
  name: string;
  objective: string | null;
  status: string | null;
};

export type AdSetRecord = {
  id: string;
  campaignId: string;
  externalId: string;
  name: string;
  status: string | null;
};

export type AdRecord = {
  id: string;
  adSetId: string;
  externalId: string;
  name: string;
  creativeName: string | null;
  status: string | null;
  thumbnailUrl?: string | null;
};

export type DailyMetricRecord = {
  id: string;
  workspaceId: string;
  adAccountId: string;
  campaignId: string | null;
  adSetId: string | null;
  adId: string | null;
  platform: PlatformType;
  metricDate: string;
  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  landingPageViews: number;
  messagesStarted: number;
  engagements: number;
  leads: number;
  checkouts: number;
  purchases: number;
  results: number;
  resultLabel: string;
  spend: number;
  revenue: number;
  videoViews25: number;
  videoViews50: number;
  videoViews75: number;
  videoViews100: number;
  ctr: number;
  cpm: number;
  cpc: number;
  costPerResult: number;
};

export type DemographicMetricRecord = {
  id: string;
  workspaceId: string;
  adAccountId: string;
  campaignId: string | null;
  adSetId: string | null;
  adId: string | null;
  platform: PlatformType;
  metricDate: string;
  ageRange: string;
  gender: string | null;
  impressions: number;
  clicks: number;
  linkClicks: number;
  results: number;
  spend: number;
};

export type FunnelRecord = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  category: string | null;
  isDefault: boolean;
  isActive: boolean;
};

export type FunnelStepRecord = {
  id: string;
  funnelId: string;
  stepKey: string;
  stepLabel: string;
  stepOrder: number;
  sourceType: MetricSourceType;
  metricSource: string;
  isActive: boolean;
};

export type CustomMetricDefinitionRecord = {
  id: string;
  workspaceId: string;
  metricKey: string;
  metricLabel: string;
  description: string | null;
  dataType: string;
  isActive: boolean;
};

export type CustomMetricValueRecord = {
  id: string;
  workspaceId: string;
  campaignId: string | null;
  adSetId: string | null;
  adId: string | null;
  metricDefinitionId: string;
  metricDate: string;
  metricValue: number;
};

export type CreativeRuleRecord = {
  id: string;
  workspaceId: string;
  goodMax: number;
  attentionMax: number;
  replaceMax: number;
  criticalMax: number;
};

export type SyncRunRecord = {
  id: string;
  workspaceId: string;
  platform: PlatformType;
  status: "ok" | "warning" | "error" | "running";
  startedAt: string;
  finishedAt: string | null;
  insertedRows: number;
  errorMessage: string | null;
};

export type BenchmarkValues = {
  cpm: number;
  costPerVisit: number;
  costPerEngagement: number;
  costPerLead: number;
  costPerSale: number;
};

export type BudgetPlanRecord = {
  id: string;
  workspaceId: string;
  name: string;
  periodDays: number;
  totalBudget: number;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  isActive: boolean;
};

export type BudgetChannelRecord = {
  id: string;
  budgetPlanId: string;
  platform: PlatformType;
  percentage: number;
  amount: number;
};

export type BudgetObjectiveRecord = {
  id: string;
  budgetPlanId: string;
  platform: PlatformType;
  objective: string;
  percentage: number;
  periodDays: number;
  dailyBudget: number;
  totalBudget: number;
  sortOrder: number;
};

export type BudgetEstimateRecord = {
  id: string;
  budgetPlanId: string;
  platform: PlatformType;
  metricKey: string;
  metricLabel: string;
  dailyResult: number;
  totalResult: number;
};

export type SelectOption = {
  value: string;
  label: string;
};

export type KpiMetrics = {
  investment: number;
  results: number;
  resultLabel: string;
  costPerResult: number;
  revenue: number;
  ctr: number;
  cpm: number;
  impressions: number;
  clicks: number;
};

export type TimelinePoint = {
  date: string;
  spend: number;
  results: number;
};

export type FunnelStepResult = {
  id: string;
  label: string;
  value: number;
  rateFromPrevious: number | null;
};

export type FunnelResult = {
  id: string;
  name: string;
  category: string | null;
  steps: FunnelStepResult[];
};

export type DemographicSlice = {
  name: string;
  value: number;
};

export type CreativeHealthStatus = "good" | "warning" | "replace" | "critical";

export type CreativeHealthRow = {
  adId: string;
  adName: string;
  campaignName: string;
  platform: PlatformType;
  frequency: number;
  ctr: number;
  costPerResult: number;
  spend: number;
  results: number;
  frequencyTrend: number;
  ctrTrend: number;
  costTrend: number;
  status: CreativeHealthStatus;
  recommendation: string;
};

export type CreativeHealthSummary = {
  good: number;
  warning: number;
  replace: number;
  critical: number;
};

export type AlertItem = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
};

export type PerformanceRow = {
  key: string;
  campaignName: string;
  platform: PlatformType;
  clicks: number;
  results: number;
  ctr: number;
  spend: number;
  costPerResult: number;
  revenue: number;
};

export type ChannelDistributionState = {
  platform: PlatformType;
  percentage: number;
  amount: number;
};

export type ObjectiveDistributionState = {
  id: string;
  platform: PlatformType;
  objective: string;
  percentage: number;
  periodDays: number;
  dailyBudget: number;
  totalBudget: number;
};

export type EstimateMetric = {
  metricKey: string;
  metricLabel: string;
  dailyResult: number;
  totalResult: number;
};

export type BudgetPlannerState = {
  id?: string;
  workspaceId: string;
  name: string;
  totalBudget: number;
  periodDays: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
  channels: ChannelDistributionState[];
  objectives: ObjectiveDistributionState[];
  benchmarks: Record<PlatformType, BenchmarkValues>;
  estimates: Record<PlatformType, EstimateMetric[]>;
};

export type BudgetComparisonRow = {
  platform: PlatformType;
  plannedBudget: number;
  realizedBudget: number;
  plannedResults: number;
  realizedResults: number;
};

export type DashboardOverviewData = {
  filters: Required<DashboardFilters>;
  workspaceOptions: SelectOption[];
  campaignOptions: SelectOption[];
  funnelOptions: SelectOption[];
  kpis: KpiMetrics;
  timeline: TimelinePoint[];
  funnel: FunnelResult | null;
  demographics: DemographicSlice[];
  creativeSummary: CreativeHealthSummary;
  creativeRows: CreativeHealthRow[];
  alerts: AlertItem[];
  performanceRows: PerformanceRow[];
};

export type BudgetOverviewData = {
  filters: Required<DashboardFilters>;
  workspaceOptions: SelectOption[];
  campaignOptions: SelectOption[];
  budgetPlan: BudgetPlannerState;
  budgetComparison: BudgetComparisonRow[];
};

export type ControlOverviewData = {
  filters: Required<DashboardFilters>;
  workspaceOptions: SelectOption[];
  syncRuns: SyncRunRecord[];
  creativeRules: CreativeRuleRecord;
  funnels: Array<FunnelRecord & { steps: FunnelStepRecord[] }>;
  customMetrics: CustomMetricDefinitionRecord[];
};

export type DataSnapshot = {
  workspaces: WorkspaceRecord[];
  adAccounts: AdAccountRecord[];
  campaigns: CampaignRecord[];
  adSets: AdSetRecord[];
  ads: AdRecord[];
  dailyMetrics: DailyMetricRecord[];
  demographicMetrics: DemographicMetricRecord[];
  funnels: FunnelRecord[];
  funnelSteps: FunnelStepRecord[];
  customMetricDefinitions: CustomMetricDefinitionRecord[];
  customMetricValues: CustomMetricValueRecord[];
  creativeRules: CreativeRuleRecord[];
  syncRuns: SyncRunRecord[];
  budgetPlans: BudgetPlanRecord[];
  budgetChannels: BudgetChannelRecord[];
  budgetObjectives: BudgetObjectiveRecord[];
  budgetEstimates: BudgetEstimateRecord[];
  benchmarks: Array<{ workspaceId: string | null; platform: PlatformType; metricKey: string; metricLabel: string; metricValue: number }>;
};
