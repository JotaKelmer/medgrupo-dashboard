import type {
  BenchmarkValues,
  CreativeRuleRecord,
  PlatformType,
  SelectOption,
  StandardMetricKey,
} from "./types";

export const DEFAULT_DATE_RANGE_DAYS = 30;

export const PLATFORM_LABELS: Record<PlatformType, string> = {
  meta: "Meta Ads",
  google: "Google Ads",
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
  { value: "video_views_100", label: "VV 100%" },
];

export const DEFAULT_OBJECTIVES = [
  "Reconhecimento",
  "Tráfego",
  "Engajamento",
  "Cadastros",
  "Vendas",
];

export const DEFAULT_BENCHMARKS: Record<PlatformType, BenchmarkValues> = {
  meta: {
    cpm: 40,
    costPerVisit: 1.5,
    costPerEngagement: 1.2,
    costPerLead: 12,
    costPerSale: 80,
  },
  google: {
    cpm: 35,
    costPerVisit: 2.2,
    costPerEngagement: 1.8,
    costPerLead: 15,
    costPerSale: 95,
  },
};

export const DEFAULT_CREATIVE_RULES: Omit<CreativeRuleRecord, "id" | "workspaceId"> = {
  goodMax: 6,
  attentionMax: 10,
  replaceMax: 15,
  criticalMax: 18,
};

export type BusinessUnitValue = "R1" | "R+" | "Complementares";

type BusinessUnitCatalogEntry = {
  bu: BusinessUnitValue;
  product: string;
  aliases: string[];
};

export function normalizeBracketToken(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function extractCampaignParts(name: string) {
  const matches = [...name.matchAll(/\[([^\]]+)\]/g)].map((match) =>
    normalizeBracketToken(match[1] ?? ""),
  );

  return {
    product: matches[0] ?? "",
    campaignGroup: matches[1] ?? "",
  };
}

function normalizeCatalogKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9+&]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const BUSINESS_UNIT_PRODUCT_CATALOG: BusinessUnitCatalogEntry[] = [
  { bu: "R1", product: "Extensivo", aliases: ["EXTENSIVO"] },
  {
    bu: "R1",
    product: "MEDCURSO e MED",
    aliases: ["MEDCURSO E MED", "MEDCURSO", "MEDCURSO + MED", "MEDCURSO/MED"],
  },
  { bu: "R1", product: "MEDMASTER", aliases: ["MEDMASTER"] },
  { bu: "R1", product: "Intensivo", aliases: ["INTENSIVO"] },
  {
    bu: "R1",
    product: "INTENSIVÃO R1 + ENAMED",
    aliases: ["INTENSIVAO R1 + ENAMED", "INTENSIVAO R1 ENAMED", "INTENSIVAO R1"],
  },
  {
    bu: "R1",
    product: "MED FOCO + ENAMED",
    aliases: ["MED FOCO + ENAMED", "MED FOCO ENAMED", "MEDFOCO + ENAMED", "MEDFOCO ENAMED"],
  },
  {
    bu: "R1",
    product: "ENAMED 4º ano",
    aliases: ["ENAMED 4 ANO", "ENAMED 4O ANO", "ENAMED 4º ANO", "ENAMED QUARTO ANO"],
  },
  {
    bu: "R+",
    product: "Preparação R+",
    aliases: ["PREPARACAO R+", "PREPARAÇÃO R+", "R+", "R PLUS"],
  },
  {
    bu: "R+",
    product: "INTENSIVÃO R+",
    aliases: ["INTENSIVAO R+", "INTENSIVAO R PLUS", "INTENSIVAO R"],
  },
  { bu: "R+", product: "TED", aliases: ["TED"] },
  { bu: "R+", product: "TEGO", aliases: ["TEGO"] },
  {
    bu: "R+",
    product: "INTENSIVÃO TED",
    aliases: ["INTENSIVAO TED", "INTENSIVÃO TED"],
  },
  {
    bu: "R+",
    product: "TED PRÁTICO",
    aliases: ["TED PRATICO", "TED PRÁTICO"],
  },
  {
    bu: "Complementares",
    product: "REVALIDAAÇÃO",
    aliases: ["REVALIDAACAO", "REVALIDAAÇÃO", "REVALIDACAO"],
  },
  {
    bu: "Complementares",
    product: "ENCONTRO REVALIDAAÇÃO",
    aliases: ["ENCONTRO REVALIDAACAO", "ENCONTRO REVALIDAAÇÃO"],
  },
  {
    bu: "Complementares",
    product: "CPMED REVALIDA",
    aliases: ["CPMED REVALIDA", "CPMED REVALIDAÇÃO", "CPMED REVALIDACAO", "CPMED REVALIDA ACAO"],
  },
  {
    bu: "Complementares",
    product: "CPMED PREMIUM",
    aliases: ["CPMED PREMIUM"],
  },
  {
    bu: "Complementares",
    product: "CPMED EXTENSIVO",
    aliases: ["CPMED EXTENSIVO"],
  },
  {
    bu: "Complementares",
    product: "ABC da Medicina",
    aliases: ["ABC DA MEDICINA"],
  },
  {
    bu: "Complementares",
    product: "MEDBASE PRÁTICO",
    aliases: ["MEDBASE PRATICO", "MEDBASE PRÁTICO", "MEDBASE", "MEDBASE PRATICO PRESENCIAL"],
  },
  { bu: "Complementares", product: "MEDELETRO", aliases: ["MEDELETRO"] },
  { bu: "Complementares", product: "MEDIMAGEM", aliases: ["MEDIMAGEM"] },
  { bu: "Complementares", product: "VENTILAMED", aliases: ["VENTILAMED"] },
  { bu: "Complementares", product: "MEDATB", aliases: ["MEDATB"] },
  { bu: "Complementares", product: "PERSONAMED", aliases: ["PERSONAMED"] },
  { bu: "Complementares", product: "MEDSoft", aliases: ["MEDSOFT"] },
  { bu: "Complementares", product: "MEDMe", aliases: ["MEDME"] },
  { bu: "Complementares", product: "ByMed", aliases: ["BYMED"] },
  {
    bu: "Complementares",
    product: "Parceria Enamed IEs",
    aliases: ["PARCERIA ENAMED IES", "PARCERIA ENAMED IE'S", "PARCERIA ENAMED IES"],
  },
  {
    bu: "Complementares",
    product: "Revisão Avançada ENAMED 4º ano",
    aliases: [
      "REVISAO AVANCADA ENAMED 4 ANO",
      "REVISÃO AVANÇADA ENAMED 4º ANO",
      "REVISAO AVANCADA ENAMED 4O ANO",
    ],
  },
  {
    bu: "Complementares",
    product: "Planejamento em 3 anos",
    aliases: ["PLANEJAMENTO EM 3 ANOS", "PLANEJAMENTO 3 ANOS"],
  },
];

const BUSINESS_UNIT_ORDER: BusinessUnitValue[] = ["R1", "R+", "Complementares"];

export const BUSINESS_UNIT_OPTIONS: SelectOption[] = BUSINESS_UNIT_ORDER.map((value) => ({
  value,
  label: value,
}));

const businessUnitIndex = new Map<string, BusinessUnitValue>(
  BUSINESS_UNIT_OPTIONS.map((option) => [normalizeCatalogKey(option.value), option.value as BusinessUnitValue]),
);

const productAliasIndex = new Map<string, BusinessUnitCatalogEntry>();
for (const entry of BUSINESS_UNIT_PRODUCT_CATALOG) {
  const aliases = [entry.product, ...entry.aliases];
  for (const alias of aliases) {
    productAliasIndex.set(normalizeCatalogKey(alias), entry);
  }
}

export function normalizeBusinessUnitValue(value?: string | null) {
  if (!value) return "";
  return businessUnitIndex.get(normalizeCatalogKey(value)) ?? "";
}

export function getBusinessUnitSortOrder(value?: string | null) {
  const normalized = normalizeBusinessUnitValue(value);
  if (!normalized) return BUSINESS_UNIT_ORDER.length;
  const index = BUSINESS_UNIT_ORDER.indexOf(normalized as BusinessUnitValue);
  return index >= 0 ? index : BUSINESS_UNIT_ORDER.length;
}

export function resolveBusinessUnitProduct(value?: string | null) {
  if (!value) return null;
  const normalized = normalizeCatalogKey(value);
  if (!normalized) return null;
  return productAliasIndex.get(normalized) ?? null;
}

export function getBusinessUnitForProduct(value?: string | null) {
  return resolveBusinessUnitProduct(value)?.bu ?? "";
}

function sortSelectOptionsByCatalog(options: SelectOption[]) {
  return [...options].sort((a, b) => {
    const productA = resolveBusinessUnitProduct(a.value);
    const productB = resolveBusinessUnitProduct(b.value);
    const buCompare = getBusinessUnitSortOrder(productA?.bu) - getBusinessUnitSortOrder(productB?.bu);

    if (buCompare !== 0) return buCompare;

    return a.label.localeCompare(b.label, "pt-BR");
  });
}

export function buildCatalogProductOptions(selectedBu?: string) {
  const normalizedBu = normalizeBusinessUnitValue(selectedBu);

  const options = BUSINESS_UNIT_PRODUCT_CATALOG.filter((entry) =>
    normalizedBu ? entry.bu === normalizedBu : true,
  ).map((entry) => ({
    value: entry.product,
    label: entry.product,
  }));

  return sortSelectOptionsByCatalog(options);
}

export function buildBusinessUnitOptionsFromProductOptions(productOptions: SelectOption[]) {
  const seen = new Set<string>();

  const options = productOptions
    .map((option) => getBusinessUnitForProduct(option.value))
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .map((value) => ({ value, label: value }));

  if (!options.length) {
    return BUSINESS_UNIT_OPTIONS;
  }

  return options.sort(
    (a, b) => getBusinessUnitSortOrder(a.value) - getBusinessUnitSortOrder(b.value),
  );
}

export function buildCampaignProductOptions(
  campaignOptions: SelectOption[],
  selectedBu?: string,
) {
  const normalizedBu = normalizeBusinessUnitValue(selectedBu);
  const seen = new Set<string>();

  const options = campaignOptions
    .map((option) => {
      const parts = extractCampaignParts(option.label);
      const resolved = resolveBusinessUnitProduct(parts.product);
      const product = resolved?.product ?? parts.product;
      const bu = resolved?.bu ?? "";

      return {
        product,
        bu,
      };
    })
    .filter((item) => {
      if (!item.product) return false;
      if (normalizedBu && item.bu !== normalizedBu) return false;
      const dedupeKey = `${item.bu || "sem-bu"}:${item.product}`;
      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
      return true;
    })
    .map((item) => ({ value: item.product, label: item.product }));

  if (!options.length) {
    return buildCatalogProductOptions(normalizedBu);
  }

  return sortSelectOptionsByCatalog(options);
}

export function buildCampaignBusinessUnitOptions(campaignOptions: SelectOption[]) {
  const productOptions = buildCampaignProductOptions(campaignOptions);
  return buildBusinessUnitOptionsFromProductOptions(productOptions);
}
