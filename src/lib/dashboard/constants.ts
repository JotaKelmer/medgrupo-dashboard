import type {
  BenchmarkValues,
  CreativeRuleRecord,
  PlatformType,
  StandardMetricKey
} from "./types";

export const DEFAULT_DATE_RANGE_DAYS = 30;

export const PLATFORM_LABELS: Record<PlatformType, string> = {
  meta: "Meta Ads",
  google: "Google Ads"
};

export const STANDARD_METRIC_OPTIONS: Array<{ value: StandardMetricKey; label: string }> = [
  { value: "impressions", label: "Impressões" },
  { value: "reach", label: "Alcance" },
  { value: "clicks", label: "Cliques" },
  { value: "link_clicks", label: "Cliques no link" },
  { value: "landing_page_views", label: "Landing Page Views" },
  { value: "messages_started", label: "Mensagens iniciadas" },
  { value: "engagements", label: "Engajamentos" },
  { value: "leads", label: "Leads" },
  { value: "checkouts", label: "Checkout" },
  { value: "purchases", label: "Compras" },
  { value: "results", label: "Resultado" },
  { value: "video_views_25", label: "VV 25%" },
  { value: "video_views_50", label: "VV 50%" },
  { value: "video_views_75", label: "VV 75%" },
  { value: "video_views_100", label: "VV 100%" }
];

export const DEFAULT_OBJECTIVES = [
  "Reconhecimento",
  "Tráfego",
  "Engajamento",
  "Cadastros",
  "Vendas"
];

export const DEFAULT_BENCHMARKS: Record<PlatformType, BenchmarkValues> = {
  meta: {
    cpm: 40,
    costPerVisit: 1.5,
    costPerEngagement: 1.2,
    costPerLead: 12,
    costPerSale: 80
  },
  google: {
    cpm: 35,
    costPerVisit: 2.2,
    costPerEngagement: 1.8,
    costPerLead: 15,
    costPerSale: 95
  }
};

export const DEFAULT_CREATIVE_RULES: Omit<CreativeRuleRecord, "id" | "workspaceId"> = {
  goodMax: 6,
  attentionMax: 10,
  replaceMax: 15,
  criticalMax: 18
};
