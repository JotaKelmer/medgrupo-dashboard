export type CommercialRole =
  | "owner"
  | "admin"
  | "manager"
  | "analyst"
  | "viewer";

export type CommercialFilters = {
  workspaceId: string;
  startDate: string;
  endDate: string;
  ownerId: string;
};

export type CommercialSellerOption = {
  value: string;
  label: string;
  email?: string | null;
};

export type CommercialDailyMetricRecord = {
  id: string;
  workspaceId: string;
  metricDate: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string | null;
  totalOpenDeals: number;
  dealsUpdatedThisMonth: number;
  coveragePercent: number;
  activitiesDoneYesterday: number;
  activitiesTotalYesterday: number;
  activitiesOverdue: number;
  dealsAdvancedYesterday: number;
  dealsWonYesterday: number;
  dealsLostYesterday: number;
  advancementPercent: number;
  stagnantDeals: number;
  stagnantPercent: number;
  source: string | null;
  syncedAt: string | null;
};

export type CommercialAggregatedMetric = {
  ownerId: string;
  ownerName: string;
  ownerEmail: string | null;
  totalOpenDeals: number;
  dealsUpdatedThisMonth: number;
  coveragePercent: number;
  activitiesDoneYesterday: number;
  activitiesTotalYesterday: number;
  activitiesOverdue: number;
  dealsAdvancedYesterday: number;
  dealsWonYesterday: number;
  dealsLostYesterday: number;
  advancementPercent: number;
  stagnantDeals: number;
  stagnantPercent: number;
  score: number;
  latestDate: string;
};

export type CommercialSummary = {
  coverage: number;
  activities: number;
  advances: number;
  won: number;
  lost: number;
  quality: number;
  totalDeals: number;
};

export type CommercialWeeklyPoint = {
  weekLabel: string;
  weekStart: string;
  ownerScore: number;
  teamAverageScore: number;
};

export type CommercialFeedbackRecord = {
  id: string;
  workspaceId: string;
  ownerId: string;
  ownerName: string;
  periodStart: string;
  periodEnd: string;
  aiFeedback: string | null;
  manualFeedback: string | null;
  createdAt: string;
  updatedAt: string;
  authorUserId: string | null;
  authorName: string | null;
};

export type CommercialOverviewData = {
  filters: CommercialFilters;
  metrics: CommercialDailyMetricRecord[];
  previousMetrics: CommercialDailyMetricRecord[];
  sellerOptions: CommercialSellerOption[];
  canEdit: boolean;
  viewerEmail: string | null;
  role: CommercialRole;
  isMock: boolean;
};

export type PipedriveCommercialMetricRow = {
  metric_date: string;
  owner_external_id: string;
  owner_name: string;
  owner_email: string | null;
  total_open_deals: number;
  deals_updated_this_month: number;
  coverage_percent: number;
  activities_done_yesterday: number;
  activities_total_yesterday: number;
  activities_overdue: number;
  deals_advanced_yesterday: number;
  deals_won_yesterday: number;
  deals_lost_yesterday: number;
  advancement_percent: number;
  stagnant_deals: number;
  stagnant_percent: number;
};
