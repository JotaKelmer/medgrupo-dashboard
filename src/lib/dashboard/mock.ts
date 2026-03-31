import { DEFAULT_BENCHMARKS } from "./constants";
import type {
  AdAccountRecord,
  AdRecord,
  AdSetRecord,
  BudgetChannelRecord,
  BudgetEstimateRecord,
  BudgetObjectiveRecord,
  BudgetPlanRecord,
  CampaignRecord,
  CreativeRuleRecord,
  CustomMetricDefinitionRecord,
  CustomMetricValueRecord,
  DailyMetricRecord,
  DataSnapshot,
  DemographicMetricRecord,
  FunnelRecord,
  FunnelStepRecord,
  PlatformType,
  SyncRunRecord,
  WorkspaceRecord
} from "./types";
import { addDays, toISODate } from "./utils";

const workspaceId = "workspace-medgrupo";
const metaAccountId = "account-meta-medgrupo";
const googleAccountId = "account-google-medgrupo";

const workspaces: WorkspaceRecord[] = [
  {
    id: workspaceId,
    name: "MEDGRUPO",
    slug: "medgrupo",
    primaryColor: "#D9EB1A",
    secondaryColor: "#489696",
    accentColor: "#8E1AEB",
    backgroundColor: "#121616",
    timezone: "America/Sao_Paulo",
    isActive: true
  }
];

const adAccounts: AdAccountRecord[] = [
  {
    id: metaAccountId,
    workspaceId,
    platform: "meta",
    externalId: "meta-123456",
    name: "MEDGRUPO | Meta Ads",
    currency: "BRL",
    timezone: "America/Sao_Paulo",
    isActive: true
  },
  {
    id: googleAccountId,
    workspaceId,
    platform: "google",
    externalId: "google-987654",
    name: "MEDGRUPO | Google Ads",
    currency: "BRL",
    timezone: "America/Sao_Paulo",
    isActive: true
  }
];

const campaigns: CampaignRecord[] = [
  {
    id: "campaign-meta-conversao",
    workspaceId,
    adAccountId: metaAccountId,
    platform: "meta",
    externalId: "cmp-meta-1",
    name: "Vestibular | Captação",
    objective: "Cadastros",
    status: "ACTIVE"
  },
  {
    id: "campaign-meta-whatsapp",
    workspaceId,
    adAccountId: metaAccountId,
    platform: "meta",
    externalId: "cmp-meta-2",
    name: "Always On | WhatsApp",
    objective: "Mensagens",
    status: "ACTIVE"
  },
  {
    id: "campaign-google-search",
    workspaceId,
    adAccountId: googleAccountId,
    platform: "google",
    externalId: "cmp-google-1",
    name: "Search Brand | Leads",
    objective: "Cadastros",
    status: "ACTIVE"
  }
];

const adSets: AdSetRecord[] = [
  {
    id: "adset-meta-1",
    campaignId: "campaign-meta-conversao",
    externalId: "adset-meta-1",
    name: "Interesses | Medicina",
    status: "ACTIVE"
  },
  {
    id: "adset-meta-2",
    campaignId: "campaign-meta-whatsapp",
    externalId: "adset-meta-2",
    name: "Remarketing | Vídeo",
    status: "ACTIVE"
  },
  {
    id: "adset-google-1",
    campaignId: "campaign-google-search",
    externalId: "adset-google-1",
    name: "Search | Brand",
    status: "ACTIVE"
  }
];

const ads: AdRecord[] = [
  {
    id: "ad-meta-1",
    adSetId: "adset-meta-1",
    externalId: "ad-meta-1",
    name: "Criativo A | Aprovação",
    creativeName: "Vídeo A",
    status: "ACTIVE"
  },
  {
    id: "ad-meta-2",
    adSetId: "adset-meta-1",
    externalId: "ad-meta-2",
    name: "Criativo B | Depoimento",
    creativeName: "Vídeo B",
    status: "ACTIVE"
  },
  {
    id: "ad-meta-3",
    adSetId: "adset-meta-2",
    externalId: "ad-meta-3",
    name: "Criativo C | WhatsApp",
    creativeName: "Imagem C",
    status: "ACTIVE"
  },
  {
    id: "ad-google-1",
    adSetId: "adset-google-1",
    externalId: "ad-google-1",
    name: "Search Brand | Headline 1",
    creativeName: "RSA 1",
    status: "ACTIVE"
  }
];

function getCampaignIdByAd(adId: string) {
  const ad = ads.find((item) => item.id === adId);
  const adSet = adSets.find((item) => item.id === ad?.adSetId);
  return adSet?.campaignId ?? null;
}

function getAdSetIdByAd(adId: string) {
  return ads.find((item) => item.id === adId)?.adSetId ?? null;
}

function getPlatformByCampaign(campaignId: string | null): PlatformType {
  return campaigns.find((item) => item.id === campaignId)?.platform ?? "meta";
}

function getAdAccountByPlatform(platform: PlatformType) {
  return adAccounts.find((item) => item.platform === platform)!;
}

function resultLabelByCampaign(campaignId: string | null) {
  if (campaignId === "campaign-meta-whatsapp") return "Mensagens";
  return "Leads";
}

function generateDailyMetrics() {
  const today = new Date();
  const start = addDays(today, -29);
  const rows: DailyMetricRecord[] = [];

  for (let offset = 0; offset < 30; offset += 1) {
    const metricDate = toISODate(addDays(start, offset));

    ads.forEach((ad, index) => {
      const campaignId = getCampaignIdByAd(ad.id);
      const adSetId = getAdSetIdByAd(ad.id);
      const platform = getPlatformByCampaign(campaignId);
      const account = getAdAccountByPlatform(platform);

      const baseImpressions = platform === "meta" ? 4600 + index * 420 : 2900 + index * 280;
      const weekdayBoost = offset % 7 === 1 || offset % 7 === 2 ? 1.14 : 1;
      const fatigue = ad.id === "ad-meta-2" ? 1 + offset * 0.018 : ad.id === "ad-meta-3" ? 1 + offset * 0.03 : 1 + offset * 0.008;
      const impressions = Math.round(baseImpressions * weekdayBoost);
      const reach = Math.round(impressions / fatigue);
      const ctrBase = ad.id === "ad-meta-2" ? 0.0108 : ad.id === "ad-meta-3" ? 0.0132 : platform === "google" ? 0.026 : 0.017;
      const ctrDecay = ad.id === "ad-meta-3" ? 1 - offset * 0.012 : ad.id === "ad-meta-2" ? 1 - offset * 0.007 : 1 - offset * 0.003;
      const ctr = Math.max(ctrBase * ctrDecay, platform === "google" ? 0.016 : 0.007);
      const clicks = Math.round(impressions * ctr);
      const linkClicks = Math.round(clicks * (platform === "google" ? 0.92 : 0.78));
      const landingPageViews = Math.round(linkClicks * (platform === "google" ? 0.74 : 0.61));
      const messagesStarted = campaignId === "campaign-meta-whatsapp" ? Math.round(linkClicks * 0.18) : 0;
      const leads =
        campaignId === "campaign-meta-whatsapp"
          ? Math.round(messagesStarted * 0.34)
          : Math.round(landingPageViews * (platform === "google" ? 0.16 : 0.12));
      const checkouts = Math.round(leads * 0.44);
      const purchases = campaignId === "campaign-meta-whatsapp" ? Math.round(leads * 0.18) : Math.round(checkouts * 0.31);

      const spendBase = platform === "google" ? 320 + index * 48 : 410 + index * 52;
      const spend = Number((spendBase * weekdayBoost * (1 + offset * 0.012)).toFixed(2));
      const results = campaignId === "campaign-meta-whatsapp" ? messagesStarted : leads;
      const revenue = Number((purchases * 1200 + leads * 160).toFixed(2));

      const videoViews25 = platform === "meta" ? Math.round(impressions * 0.38) : 0;
      const videoViews50 = platform === "meta" ? Math.round(videoViews25 * 0.65) : 0;
      const videoViews75 = platform === "meta" ? Math.round(videoViews50 * 0.58) : 0;
      const videoViews100 = platform === "meta" ? Math.round(videoViews75 * 0.44) : 0;

      rows.push({
        id: `${metricDate}-${ad.id}`,
        workspaceId,
        adAccountId: account.id,
        campaignId,
        adSetId,
        adId: ad.id,
        platform,
        metricDate,
        impressions,
        reach,
        clicks,
        linkClicks,
        landingPageViews,
        messagesStarted,
        engagements: Math.round(clicks * (platform === "meta" ? 1.6 : 1.2)),
        leads,
        checkouts,
        purchases,
        results,
        resultLabel: resultLabelByCampaign(campaignId),
        spend,
        revenue,
        videoViews25,
        videoViews50,
        videoViews75,
        videoViews100,
        ctr: Number((impressions ? (clicks / impressions) * 100 : 0).toFixed(4)),
        cpm: Number((impressions ? (spend / impressions) * 1000 : 0).toFixed(4)),
        cpc: Number((clicks ? spend / clicks : 0).toFixed(4)),
        costPerResult: Number((results ? spend / results : 0).toFixed(4))
      });
    });
  }

  return rows;
}

const dailyMetrics = generateDailyMetrics();

function generateDemographics() {
  const ageRanges = [
    { range: "18-24", share: 0.22 },
    { range: "25-34", share: 0.42 },
    { range: "35-44", share: 0.20 },
    { range: "45-54", share: 0.10 },
    { range: "55+", share: 0.06 }
  ];

  const groupedByDate = new Map<string, { impressions: number; clicks: number; results: number; spend: number }>();

  for (const row of dailyMetrics) {
    const current = groupedByDate.get(row.metricDate) ?? { impressions: 0, clicks: 0, results: 0, spend: 0 };
    current.impressions += row.impressions;
    current.clicks += row.clicks;
    current.results += row.results;
    current.spend += row.spend;
    groupedByDate.set(row.metricDate, current);
  }

  const rows: DemographicMetricRecord[] = [];

  for (const [metricDate, totals] of groupedByDate.entries()) {
    ageRanges.forEach((bucket) => {
      rows.push({
        id: `${metricDate}-${bucket.range}`,
        workspaceId,
        adAccountId: metaAccountId,
        campaignId: null,
        adSetId: null,
        adId: null,
        platform: "meta",
        metricDate,
        ageRange: bucket.range,
        gender: null,
        impressions: Math.round(totals.impressions * bucket.share),
        clicks: Math.round(totals.clicks * bucket.share),
        linkClicks: Math.round(totals.clicks * bucket.share * 0.82),
        results: Math.round(totals.results * bucket.share),
        spend: Number((totals.spend * bucket.share).toFixed(2))
      });
    });
  }

  return rows;
}

const demographicMetrics = generateDemographics();

const funnels: FunnelRecord[] = [
  {
    id: "funnel-vendas",
    workspaceId,
    name: "Funil de Vendas",
    description: "Jornada completa até compra",
    category: "vendas",
    isDefault: true,
    isActive: true
  },
  {
    id: "funnel-video",
    workspaceId,
    name: "Retenção de Vídeo",
    description: "Consumo de vídeo por marcos",
    category: "video",
    isDefault: false,
    isActive: true
  },
  {
    id: "funnel-whatsapp",
    workspaceId,
    name: "WhatsApp Comercial",
    description: "Da impressão até lead qualificado",
    category: "whatsapp",
    isDefault: false,
    isActive: true
  }
];

const funnelSteps: FunnelStepRecord[] = [
  {
    id: "funnel-vendas-1",
    funnelId: "funnel-vendas",
    stepKey: "impressions",
    stepLabel: "Impressões",
    stepOrder: 1,
    sourceType: "standard",
    metricSource: "impressions",
    isActive: true
  },
  {
    id: "funnel-vendas-2",
    funnelId: "funnel-vendas",
    stepKey: "clicks",
    stepLabel: "Cliques",
    stepOrder: 2,
    sourceType: "standard",
    metricSource: "link_clicks",
    isActive: true
  },
  {
    id: "funnel-vendas-3",
    funnelId: "funnel-vendas",
    stepKey: "lpv",
    stepLabel: "LPV",
    stepOrder: 3,
    sourceType: "standard",
    metricSource: "landing_page_views",
    isActive: true
  },
  {
    id: "funnel-vendas-4",
    funnelId: "funnel-vendas",
    stepKey: "leads",
    stepLabel: "Leads",
    stepOrder: 4,
    sourceType: "standard",
    metricSource: "leads",
    isActive: true
  },
  {
    id: "funnel-vendas-5",
    funnelId: "funnel-vendas",
    stepKey: "purchases",
    stepLabel: "Compras",
    stepOrder: 5,
    sourceType: "standard",
    metricSource: "purchases",
    isActive: true
  },
  {
    id: "funnel-video-1",
    funnelId: "funnel-video",
    stepKey: "vv25",
    stepLabel: "VV 25%",
    stepOrder: 1,
    sourceType: "standard",
    metricSource: "video_views_25",
    isActive: true
  },
  {
    id: "funnel-video-2",
    funnelId: "funnel-video",
    stepKey: "vv50",
    stepLabel: "VV 50%",
    stepOrder: 2,
    sourceType: "standard",
    metricSource: "video_views_50",
    isActive: true
  },
  {
    id: "funnel-video-3",
    funnelId: "funnel-video",
    stepKey: "vv75",
    stepLabel: "VV 75%",
    stepOrder: 3,
    sourceType: "standard",
    metricSource: "video_views_75",
    isActive: true
  },
  {
    id: "funnel-video-4",
    funnelId: "funnel-video",
    stepKey: "vv100",
    stepLabel: "VV 100%",
    stepOrder: 4,
    sourceType: "standard",
    metricSource: "video_views_100",
    isActive: true
  },
  {
    id: "funnel-whatsapp-1",
    funnelId: "funnel-whatsapp",
    stepKey: "impressions",
    stepLabel: "Impressões",
    stepOrder: 1,
    sourceType: "standard",
    metricSource: "impressions",
    isActive: true
  },
  {
    id: "funnel-whatsapp-2",
    funnelId: "funnel-whatsapp",
    stepKey: "clicks",
    stepLabel: "Cliques no link",
    stepOrder: 2,
    sourceType: "standard",
    metricSource: "link_clicks",
    isActive: true
  },
  {
    id: "funnel-whatsapp-3",
    funnelId: "funnel-whatsapp",
    stepKey: "messages",
    stepLabel: "Conversas iniciadas",
    stepOrder: 3,
    sourceType: "standard",
    metricSource: "messages_started",
    isActive: true
  },
  {
    id: "funnel-whatsapp-4",
    funnelId: "funnel-whatsapp",
    stepKey: "qualified_leads",
    stepLabel: "Leads qualificados",
    stepOrder: 4,
    sourceType: "custom",
    metricSource: "qualified_leads",
    isActive: true
  }
];

const customMetricDefinitions: CustomMetricDefinitionRecord[] = [
  {
    id: "custom-qualified-leads",
    workspaceId,
    metricKey: "qualified_leads",
    metricLabel: "Leads Qualificados",
    description: "Lead que passou por qualificação comercial",
    dataType: "number",
    isActive: true
  }
];

function generateCustomMetricValues() {
  const rows: CustomMetricValueRecord[] = [];
  const whatsappMetrics = dailyMetrics.filter((row) => row.campaignId === "campaign-meta-whatsapp");

  whatsappMetrics.forEach((row) => {
    rows.push({
      id: `${row.metricDate}-qualified-leads`,
      workspaceId,
      campaignId: row.campaignId,
      adSetId: row.adSetId,
      adId: row.adId,
      metricDefinitionId: "custom-qualified-leads",
      metricDate: row.metricDate,
      metricValue: Math.round(row.messagesStarted * 0.46)
    });
  });

  return rows;
}

const customMetricValues = generateCustomMetricValues();

const creativeRules: CreativeRuleRecord[] = [
  {
    id: "creative-rules-medgrupo",
    workspaceId,
    goodMax: 6,
    attentionMax: 10,
    replaceMax: 15,
    criticalMax: 18
  }
];

const syncRuns: SyncRunRecord[] = [
  {
    id: "sync-meta-last",
    workspaceId,
    platform: "meta",
    status: "ok",
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    insertedRows: 3200,
    errorMessage: null
  },
  {
    id: "sync-google-last",
    workspaceId,
    platform: "google",
    status: "error",
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    insertedRows: 1180,
    errorMessage: "Timeout na conta de pesquisa. Reexecutar a sincronização."
  }
];

const budgetPlans: BudgetPlanRecord[] = [
  {
    id: "budget-plan-medgrupo",
    workspaceId,
    name: "Plano principal | Março",
    periodDays: 30,
    totalBudget: 30000,
    startDate: null,
    endDate: null,
    notes: "Plano base para aquisição e remarketing.",
    isActive: true
  }
];

const budgetChannels: BudgetChannelRecord[] = [
  {
    id: "budget-channel-meta",
    budgetPlanId: "budget-plan-medgrupo",
    platform: "meta",
    percentage: 67,
    amount: 20100
  },
  {
    id: "budget-channel-google",
    budgetPlanId: "budget-plan-medgrupo",
    platform: "google",
    percentage: 33,
    amount: 9900
  }
];

const budgetObjectives: BudgetObjectiveRecord[] = [
  { id: "b-obj-1", budgetPlanId: "budget-plan-medgrupo", platform: "meta", objective: "Reconhecimento", percentage: 15, periodDays: 30, dailyBudget: 100.5, totalBudget: 3015, sortOrder: 1 },
  { id: "b-obj-2", budgetPlanId: "budget-plan-medgrupo", platform: "meta", objective: "Tráfego", percentage: 20, periodDays: 30, dailyBudget: 134, totalBudget: 4020, sortOrder: 2 },
  { id: "b-obj-3", budgetPlanId: "budget-plan-medgrupo", platform: "meta", objective: "Engajamento", percentage: 15, periodDays: 30, dailyBudget: 100.5, totalBudget: 3015, sortOrder: 3 },
  { id: "b-obj-4", budgetPlanId: "budget-plan-medgrupo", platform: "meta", objective: "Cadastros", percentage: 20, periodDays: 30, dailyBudget: 134, totalBudget: 4020, sortOrder: 4 },
  { id: "b-obj-5", budgetPlanId: "budget-plan-medgrupo", platform: "meta", objective: "Vendas", percentage: 30, periodDays: 30, dailyBudget: 201, totalBudget: 6030, sortOrder: 5 },
  { id: "b-obj-6", budgetPlanId: "budget-plan-medgrupo", platform: "google", objective: "Reconhecimento", percentage: 10, periodDays: 30, dailyBudget: 33, totalBudget: 990, sortOrder: 1 },
  { id: "b-obj-7", budgetPlanId: "budget-plan-medgrupo", platform: "google", objective: "Tráfego", percentage: 30, periodDays: 30, dailyBudget: 99, totalBudget: 2970, sortOrder: 2 },
  { id: "b-obj-8", budgetPlanId: "budget-plan-medgrupo", platform: "google", objective: "Engajamento", percentage: 10, periodDays: 30, dailyBudget: 33, totalBudget: 990, sortOrder: 3 },
  { id: "b-obj-9", budgetPlanId: "budget-plan-medgrupo", platform: "google", objective: "Cadastros", percentage: 20, periodDays: 30, dailyBudget: 66, totalBudget: 1980, sortOrder: 4 },
  { id: "b-obj-10", budgetPlanId: "budget-plan-medgrupo", platform: "google", objective: "Vendas", percentage: 30, periodDays: 30, dailyBudget: 99, totalBudget: 2970, sortOrder: 5 }
];

const budgetEstimates: BudgetEstimateRecord[] = [
  { id: "be-meta-1", budgetPlanId: "budget-plan-medgrupo", platform: "meta", metricKey: "impressions", metricLabel: "Impressões", dailyResult: 16750, totalResult: 502500 },
  { id: "be-meta-2", budgetPlanId: "budget-plan-medgrupo", platform: "meta", metricKey: "visits", metricLabel: "Visitas", dailyResult: 447, totalResult: 13400 },
  { id: "be-meta-3", budgetPlanId: "budget-plan-medgrupo", platform: "meta", metricKey: "engagements", metricLabel: "Engajamentos", dailyResult: 558, totalResult: 16750 },
  { id: "be-meta-4", budgetPlanId: "budget-plan-medgrupo", platform: "meta", metricKey: "leads", metricLabel: "Leads", dailyResult: 56, totalResult: 1675 },
  { id: "be-meta-5", budgetPlanId: "budget-plan-medgrupo", platform: "meta", metricKey: "sales", metricLabel: "Vendas", dailyResult: 8.37, totalResult: 251.25 },
  { id: "be-google-1", budgetPlanId: "budget-plan-medgrupo", platform: "google", metricKey: "impressions", metricLabel: "Impressões", dailyResult: 9428, totalResult: 282857 },
  { id: "be-google-2", budgetPlanId: "budget-plan-medgrupo", platform: "google", metricKey: "visits", metricLabel: "Visitas", dailyResult: 150, totalResult: 4500 },
  { id: "be-google-3", budgetPlanId: "budget-plan-medgrupo", platform: "google", metricKey: "engagements", metricLabel: "Engajamentos", dailyResult: 183.33, totalResult: 5500 },
  { id: "be-google-4", budgetPlanId: "budget-plan-medgrupo", platform: "google", metricKey: "leads", metricLabel: "Leads", dailyResult: 22, totalResult: 660 },
  { id: "be-google-5", budgetPlanId: "budget-plan-medgrupo", platform: "google", metricKey: "sales", metricLabel: "Vendas", dailyResult: 3.47, totalResult: 104.21 }
];

const benchmarks = [
  { workspaceId, platform: "meta" as PlatformType, metricKey: "cpm", metricLabel: "CPM", metricValue: DEFAULT_BENCHMARKS.meta.cpm },
  { workspaceId, platform: "meta" as PlatformType, metricKey: "cost_per_visit", metricLabel: "Custo por Visita", metricValue: DEFAULT_BENCHMARKS.meta.costPerVisit },
  { workspaceId, platform: "meta" as PlatformType, metricKey: "cost_per_engagement", metricLabel: "Custo por Engajamento", metricValue: DEFAULT_BENCHMARKS.meta.costPerEngagement },
  { workspaceId, platform: "meta" as PlatformType, metricKey: "cost_per_lead", metricLabel: "Custo por Lead", metricValue: DEFAULT_BENCHMARKS.meta.costPerLead },
  { workspaceId, platform: "meta" as PlatformType, metricKey: "cost_per_sale", metricLabel: "Custo por Venda", metricValue: DEFAULT_BENCHMARKS.meta.costPerSale },
  { workspaceId, platform: "google" as PlatformType, metricKey: "cpm", metricLabel: "CPM", metricValue: DEFAULT_BENCHMARKS.google.cpm },
  { workspaceId, platform: "google" as PlatformType, metricKey: "cost_per_visit", metricLabel: "Custo por Visita", metricValue: DEFAULT_BENCHMARKS.google.costPerVisit },
  { workspaceId, platform: "google" as PlatformType, metricKey: "cost_per_engagement", metricLabel: "Custo por Engajamento", metricValue: DEFAULT_BENCHMARKS.google.costPerEngagement },
  { workspaceId, platform: "google" as PlatformType, metricKey: "cost_per_lead", metricLabel: "Custo por Lead", metricValue: DEFAULT_BENCHMARKS.google.costPerLead },
  { workspaceId, platform: "google" as PlatformType, metricKey: "cost_per_sale", metricLabel: "Custo por Venda", metricValue: DEFAULT_BENCHMARKS.google.costPerSale }
];

export const mockSnapshot: DataSnapshot = {
  workspaces,
  adAccounts,
  campaigns,
  adSets,
  ads,
  dailyMetrics,
  demographicMetrics,
  funnels,
  funnelSteps,
  customMetricDefinitions,
  customMetricValues,
  creativeRules,
  syncRuns,
  budgetPlans,
  budgetChannels,
  budgetObjectives,
  budgetEstimates,
  benchmarks
};
