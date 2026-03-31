import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getSupabaseConfigDiagnostics,
  isSupabaseUsingServiceRole
} from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const PLATFORM = "meta" as const;
const META_API_VERSION = "v25.0";
const DEFAULT_SYNC_DAYS = 2;
const UPSERT_CHUNK_SIZE = 500;
const SELECT_CHUNK_SIZE = 100;
const SELECT_RELATION_CHUNK_SIZE = 25;

const STRUCTURE_PAGE_LIMIT = 200;
const INSIGHTS_RESULT_PAGE_LIMIT = 200;
const ADS_STRUCTURE_PAGE_LIMIT = 100;
const INITIAL_INSIGHTS_ADSET_IDS_CHUNK_SIZE = 20;
const ASYNC_REPORT_INITIAL_POLL_DELAY_MS = 4000;
const ASYNC_REPORT_MAX_ATTEMPTS = 18;
const MIN_REQUEST_GAP_MS = 200;
const MAX_TRANSIENT_RETRIES = 4;
const MAX_RATE_LIMIT_RETRIES = 6;
const RUNNING_SYNC_STALE_AFTER_MS = 45 * 60 * 1000;
const REALTIME_STRUCTURE_REFRESH_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const DEFAULT_SYNC_MODE = "realtime" as const;

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function ensureSyncAuthorization(request: NextRequest) {
  const configuredSecret = readEnv("INTERNAL_SYNC_SECRET");

  if (!configuredSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("INTERNAL_SYNC_SECRET não configurada. Em produção, configure a chave para proteger as rotas de sync.");
    }
    return;
  }

  const requestSecret = request.headers.get("x-sync-secret")?.trim() ?? "";
  if (requestSecret !== configuredSecret) {
    throw new Error("Não autorizado.");
  }
}

const TRANSIENT_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);
const TRANSIENT_META_ERROR_CODES = new Set([1, 2, 4, 17, 32, 613, 80000]);
const RATE_LIMIT_META_ERROR_CODES = new Set([4, 17, 32, 613]);
const RATE_LIMIT_META_ERROR_SUBCODES = new Set([2446079]);
const INACTIVE_STRUCTURE_STATUSES = new Set(["ARCHIVED", "DELETED"]);

const INSIGHTS_FIELDS = [
  "campaign_id",
  "adset_id",
  "date_start",
  "date_stop",
  "impressions",
  "reach",
  "clicks",
  "spend",
  "ctr",
  "cpm",
  "cpc",
  "actions",
  "action_values",
];

const LINK_CLICK_ACTION_TYPES = [
  "link_click",
  "inline_link_click",
  "outbound_click",
];

const LANDING_PAGE_VIEW_ACTION_TYPES = ["landing_page_view"];

const MESSAGE_ACTION_TYPES = [
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.total_messaging_connection",
  "onsite_conversion.messaging_first_reply",
  "omni_total_messaging_connection",
];

const LEAD_ACTION_TYPES = [
  "lead",
  "onsite_conversion.lead",
  "offsite_conversion.fb_pixel_lead",
  "omni_lead",
];

const CHECKOUT_ACTION_TYPES = [
  "initiate_checkout",
  "offsite_conversion.fb_pixel_initiate_checkout",
  "omni_initiated_checkout",
];

const PURCHASE_ACTION_TYPES = [
  "purchase",
  "omni_purchase",
  "offsite_conversion.fb_pixel_purchase",
];

type MetaAccountRow = {
  id: string;
  workspace_id: string;
  platform: "meta" | "google";
  external_id: string;
  name: string | null;
  currency: string | null;
  timezone: string | null;
  is_active: boolean | null;
};

type MetaPagedResponse<T> = {
  data?: T[];
  paging?: {
    next?: string | null;
    previous?: string | null;
    cursors?: {
      before?: string;
      after?: string;
    };
  };
};

type MetaAction = {
  action_type?: string;
  value?: string | number | null;
};

type MetaAccountInfo = {
  id?: string;
  name?: string;
  account_status?: number | string;
  currency?: string;
  timezone_name?: string;
  [key: string]: unknown;
};

type MetaCampaignApi = {
  id: string;
  name?: string;
  status?: string;
  objective?: string;
  start_time?: string;
  stop_time?: string;
};

type MetaAdSetApi = {
  id: string;
  campaign_id?: string;
  name?: string;
  status?: string;
  start_time?: string;
  end_time?: string;
};

type MetaAdApi = {
  id: string;
  adset_id?: string;
  name?: string;
  status?: string;
  creative?: {
    id?: string;
    name?: string;
    thumbnail_url?: string;
  } | null;
};

type MetaInsightApi = {
  date_start?: string;
  date_stop?: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string | null;
  impressions?: string;
  reach?: string;
  clicks?: string;
  spend?: string;
  ctr?: string;
  cpm?: string;
  cpc?: string;
  actions?: MetaAction[];
  action_values?: MetaAction[];
};

type MetaAsyncReportCreateResponse = {
  report_run_id?: string;
  id?: string;
  data?: {
    report_run_id?: string;
    id?: string;
  };
  [key: string]: unknown;
};

type MetaAsyncReportStatus = {
  id?: string;
  async_status?: string;
  async_percent_completion?: string | number;
};

type MetaApiErrorEnvelope = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    error_user_title?: string;
    error_user_msg?: string;
    is_transient?: boolean;
    fbtrace_id?: string;
  };
  [key: string]: unknown;
};

type CampaignDbRow = {
  id: string;
  external_id: string;
  ad_account_id: string;
};

type AdSetDbRow = {
  id: string;
  external_id: string;
  campaign_id: string;
};

type SyncRunRow = {
  id: string;
  started_at: string | null;
  metadata?: Record<string, unknown> | null;
};

type SyncMode = "realtime" | "backfill";

type SyncPlan = {
  startDate: string;
  endDate: string;
  mode: SyncMode;
  forceStructureRefresh: boolean;
  syncAds: boolean;
};

type StructureMaps = {
  campaignMap: Map<string, string>;
  adSetMap: Map<string, string>;
  campaignRows: CampaignDbRow[];
  adSetRows: AdSetDbRow[];
};

type StructureRefreshResult = StructureMaps & {
  campaignsSynced: number;
  adSetsSynced: number;
  refreshed: boolean;
};

type MetaUsageSignal = {
  headerName: string;
  maxPercent: number;
  waitMs: number;
  raw: string;
};

type MetaRequestState = {
  nextAllowedAt: number;
  lastRequestAt: number;
  requestCount: number;
  rateLimitRetries: number;
  usageSignals: MetaUsageSignal[];
};

type DailyMetricInsertRow = {
  workspace_id: string;
  ad_account_id: string;
  campaign_id: string | null;
  ad_set_id: string | null;
  ad_id: string | null;
  platform: "meta";
  metric_date: string;
  impressions: number;
  reach: number;
  clicks: number;
  link_clicks: number;
  landing_page_views: number;
  messages_started: number;
  engagements: number;
  leads: number;
  checkouts: number;
  purchases: number;
  results: number;
  result_label: string;
  spend: number;
  revenue: number;
  video_views_25: number;
  video_views_50: number;
  video_views_75: number;
  video_views_100: number;
  ctr: number;
  cpm: number;
  cpc: number;
  cost_per_result: number;
};

type SyncAccountResult = {
  ok: boolean;
  skipped?: boolean;
  warnings?: string[];
  accountDbId: string;
  accountNameInDb: string | null;
  externalId: string;
  normalizedExternalId: string;
  syncRunId?: string | null;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  campaignsSynced?: number;
  adSetsSynced?: number;
  adsSynced?: number;
  dailyMetricsInserted?: number;
  metaRequestCount?: number;
  rateLimitRetries?: number;
  peakUsagePercent?: number;
  error?: string;
};

class MetaApiRequestError extends Error {
  httpStatus: number;
  code?: number;
  subcode?: number;
  isTransient: boolean;
  isRateLimit: boolean;
  retryAfterMs: number;
  fbtraceId?: string;

  constructor(params: {
    message: string;
    httpStatus: number;
    code?: number;
    subcode?: number;
    isTransient: boolean;
    isRateLimit: boolean;
    retryAfterMs: number;
    fbtraceId?: string;
  }) {
    super(params.message);
    this.name = "MetaApiRequestError";
    this.httpStatus = params.httpStatus;
    this.code = params.code;
    this.subcode = params.subcode;
    this.isTransient = params.isTransient;
    this.isRateLimit = params.isRateLimit;
    this.retryAfterMs = params.retryAfterMs;
    this.fbtraceId = params.fbtraceId;
  }
}

const DAILY_METRICS_COLUMNS = [
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
  "cost_per_result",
].join(", ");

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withJitter(ms: number) {
  const jitter = Math.min(1500, Math.round(ms * 0.15));
  return ms + Math.round(Math.random() * jitter);
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toInteger(value: unknown): number {
  return Math.round(toNumber(value));
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toIsoOrNull(value?: string | null): string | null {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

function safeJsonParse<T = unknown>(value: string | null | undefined): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeMetaAccountExternalId(externalId: string): string {
  const trimmed = externalId.trim();
  if (!trimmed) return trimmed;
  return trimmed.startsWith("act_") ? trimmed : `act_${trimmed}`;
}

function isStructureActiveStatus(status?: string | null) {
  if (!status) return true;
  return !INACTIVE_STRUCTURE_STATUSES.has(status);
}

function isTooMuchDataErrorMessage(message: string) {
  const lower = message.toLowerCase();

  return (
    lower.includes("please reduce the amount of data you're asking for") ||
    lower.includes("too many rows") ||
    lower.includes("restrict amount of ad ids") ||
    lower.includes("asynchronous query") ||
    lower.includes("reduce amount of data")
  );
}

function isTooMuchDataError(error: unknown) {
  if (error instanceof Error) {
    return isTooMuchDataErrorMessage(error.message);
  }

  return false;
}

function countDaysInclusive(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  const diffDays = Math.floor((end - start) / (24 * 60 * 60 * 1000));
  return diffDays + 1;
}

function splitDateRangeInclusive(startDate: string, endDate: string) {
  const days = eachDateInclusive(startDate, endDate);

  if (days.length <= 1) {
    return null;
  }

  const leftEndIndex = Math.floor(days.length / 2) - 1;
  const leftStartDate = days[0];
  const leftEndDate = days[leftEndIndex];
  const rightStartDate = days[leftEndIndex + 1];
  const rightEndDate = days[days.length - 1];

  return [
    { startDate: leftStartDate, endDate: leftEndDate },
    { startDate: rightStartDate, endDate: rightEndDate },
  ];
}

function getSyncPlan(request: NextRequest): SyncPlan {
  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const requestedMode = url.searchParams.get("mode")?.trim().toLowerCase();
  const forceStructureRefresh = url.searchParams.get("forceStructure") === "1";
  const syncAdsParam = url.searchParams.get("syncAds");

  if ((startDate && !endDate) || (!startDate && endDate)) {
    throw new Error("Informe startDate e endDate juntos, no formato YYYY-MM-DD.");
  }

  if (startDate && endDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      throw new Error("startDate e endDate devem estar no formato YYYY-MM-DD.");
    }

    if (startDate > endDate) {
      throw new Error("startDate não pode ser maior que endDate.");
    }

    return {
      startDate,
      endDate,
      mode: "backfill",
      forceStructureRefresh: forceStructureRefresh || requestedMode === "backfill",
      syncAds: syncAdsParam === "1" || syncAdsParam === "true" || requestedMode === "backfill",
    };
  }

  const end = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (DEFAULT_SYNC_DAYS - 1));

  return {
    startDate: toDateString(start),
    endDate: toDateString(end),
    mode: requestedMode === "backfill" ? "backfill" : DEFAULT_SYNC_MODE,
    forceStructureRefresh,
    syncAds: syncAdsParam === "1" || syncAdsParam === "true",
  };
}

function getOptionalAccountFilter(request: NextRequest): string | null {
  const url = new URL(request.url);
  const accountId = url.searchParams.get("accountId");
  return accountId?.trim() || null;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];

  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

function splitArrayInHalf<T>(items: T[]) {
  const middle = Math.ceil(items.length / 2);
  return [items.slice(0, middle), items.slice(middle)];
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

function eachDateInclusive(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (cursor <= end) {
    dates.push(toDateString(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function buildMetaUrl(pathOrUrl: string, accessToken: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    if (pathOrUrl.includes("access_token=")) {
      return pathOrUrl;
    }

    const separator = pathOrUrl.includes("?") ? "&" : "?";
    return `${pathOrUrl}${separator}access_token=${encodeURIComponent(accessToken)}`;
  }

  const cleanPath = pathOrUrl.replace(/^\/+/, "");
  const separator = cleanPath.includes("?") ? "&" : "?";

  return `https://graph.facebook.com/${META_API_VERSION}/${cleanPath}${separator}access_token=${encodeURIComponent(accessToken)}`;
}

function collectNumericEntries(
  input: unknown,
  prefix = "",
  collector: Array<{ path: string; value: number }> = []
) {
  if (typeof input === "number" && Number.isFinite(input)) {
    collector.push({ path: prefix || "root", value: input });
    return collector;
  }

  if (Array.isArray(input)) {
    input.forEach((item, index) => {
      collectNumericEntries(item, `${prefix}[${index}]`, collector);
    });
    return collector;
  }

  if (input && typeof input === "object") {
    for (const [key, value] of Object.entries(input)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      collectNumericEntries(value, nextPrefix, collector);
    }
  }

  return collector;
}

function getUsageSignalFromHeader(headerName: string, raw: string): MetaUsageSignal | null {
  const parsed = safeJsonParse<unknown>(raw);
  if (!parsed) return null;

  const numericEntries = collectNumericEntries(parsed);
  let maxPercent = 0;
  let explicitWaitMs = 0;

  for (const entry of numericEntries) {
    const path = entry.path.toLowerCase();
    const value = entry.value;

    if (path.includes("estimated_time_to_regain_access") || path.includes("reset_time_duration")) {
      explicitWaitMs = Math.max(explicitWaitMs, Math.round(value * 1000));
    }

    if (
      path.includes("call_count") ||
      path.includes("total_cputime") ||
      path.includes("total_time") ||
      path.includes("acc_id_util_pct")
    ) {
      maxPercent = Math.max(maxPercent, value);
      continue;
    }

    if (value >= 0 && value <= 100) {
      maxPercent = Math.max(maxPercent, value);
    }
  }

  let waitMs = explicitWaitMs;

  if (waitMs <= 0) {
    if (maxPercent >= 98) {
      waitMs = 65000;
    } else if (maxPercent >= 95) {
      waitMs = 45000;
    } else if (maxPercent >= 90) {
      waitMs = 30000;
    } else if (maxPercent >= 80) {
      waitMs = 15000;
    } else if (maxPercent >= 70) {
      waitMs = 5000;
    }
  }

  if (maxPercent <= 0 && waitMs <= 0) {
    return null;
  }

  return {
    headerName,
    maxPercent,
    waitMs,
    raw,
  };
}

function registerCooldown(state: MetaRequestState, waitMs: number) {
  if (waitMs <= 0) return;
  state.nextAllowedAt = Math.max(state.nextAllowedAt, Date.now() + waitMs);
}

function applyUsageCooldownFromHeaders(headers: Headers, state: MetaRequestState) {
  const usageHeaders = [
    "x-app-usage",
    "x-ad-account-usage",
    "x-business-use-case-usage",
  ];

  let strongestSignal: MetaUsageSignal | null = null;

  for (const headerName of usageHeaders) {
    const raw = headers.get(headerName);
    if (!raw) continue;

    const signal = getUsageSignalFromHeader(headerName, raw);
    if (!signal) continue;

    if (!strongestSignal || signal.waitMs > strongestSignal.waitMs) {
      strongestSignal = signal;
    }
  }

  if (strongestSignal) {
    registerCooldown(state, strongestSignal.waitMs);
    state.usageSignals.push(strongestSignal);

    if (state.usageSignals.length > 20) {
      state.usageSignals.splice(0, state.usageSignals.length - 20);
    }
  }

  return strongestSignal;
}

function getPeakUsagePercent(state: MetaRequestState) {
  return state.usageSignals.reduce((max, signal) => Math.max(max, signal.maxPercent), 0);
}

function getDefaultRateLimitWaitMs(attempt: number) {
  const baseMs = 65000;
  const multiplier = Math.max(1, attempt);
  return Math.min(3 * 60 * 1000, withJitter(baseMs + (multiplier - 1) * 15000));
}

function isMetaRateLimitErrorPayload(error: MetaApiErrorEnvelope["error"], message: string) {
  const lowerMessage = message.toLowerCase();
  const code = typeof error?.code === "number" ? error.code : undefined;
  const subcode = typeof error?.error_subcode === "number" ? error.error_subcode : undefined;

  return (
    (typeof code === "number" && RATE_LIMIT_META_ERROR_CODES.has(code)) ||
    (typeof subcode === "number" && RATE_LIMIT_META_ERROR_SUBCODES.has(subcode)) ||
    lowerMessage.includes("request limit reached") ||
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("quantidade excessiva de chamadas") ||
    lowerMessage.includes("número excessivo de ligações") ||
    lowerMessage.includes("calls to this api have exceeded the rate limit")
  );
}

function createMetaApiRequestError(
  httpStatus: number,
  payload: unknown,
  headers: Headers,
  attempt: number
) {
  const envelope = (payload ?? {}) as MetaApiErrorEnvelope;
  const apiError = envelope.error;
  const message = apiError?.message ?? JSON.stringify(payload);
  const code = typeof apiError?.code === "number" ? apiError.code : undefined;
  const subcode = typeof apiError?.error_subcode === "number" ? apiError.error_subcode : undefined;
  const isRateLimit = isMetaRateLimitErrorPayload(apiError, message);
  const isTransient =
    Boolean(apiError?.is_transient) ||
    TRANSIENT_HTTP_STATUSES.has(httpStatus) ||
    (typeof code === "number" && TRANSIENT_META_ERROR_CODES.has(code)) ||
    isRateLimit;

  const strongestSignal = (() => {
    const headersToInspect = [
      "x-app-usage",
      "x-ad-account-usage",
      "x-business-use-case-usage",
    ];

    let best: MetaUsageSignal | null = null;

    for (const headerName of headersToInspect) {
      const raw = headers.get(headerName);
      if (!raw) continue;
      const signal = getUsageSignalFromHeader(headerName, raw);
      if (!signal) continue;
      if (!best || signal.waitMs > best.waitMs) {
        best = signal;
      }
    }

    return best;
  })();

  const retryAfterMs = isRateLimit
    ? Math.max(strongestSignal?.waitMs ?? 0, getDefaultRateLimitWaitMs(attempt))
    : 0;

  const formattedMessage = [
    `Meta API error ${httpStatus}`,
    typeof code === "number" ? `code=${code}` : null,
    typeof subcode === "number" ? `subcode=${subcode}` : null,
    message,
    apiError?.error_user_title ? `title=${apiError.error_user_title}` : null,
    apiError?.error_user_msg ? `user_msg=${apiError.error_user_msg}` : null,
    apiError?.fbtrace_id ? `fbtrace_id=${apiError.fbtrace_id}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return new MetaApiRequestError({
    message: formattedMessage,
    httpStatus,
    code,
    subcode,
    isTransient,
    isRateLimit,
    retryAfterMs,
    fbtraceId: apiError?.fbtrace_id,
  });
}

async function waitForRequestSlot(state: MetaRequestState) {
  const now = Date.now();
  const earliestAllowedAt = Math.max(state.nextAllowedAt, state.lastRequestAt + MIN_REQUEST_GAP_MS);
  const waitMs = earliestAllowedAt - now;

  if (waitMs > 0) {
    await sleep(waitMs);
  }
}

async function fetchMetaJson<T>(
  pathOrUrl: string,
  accessToken: string,
  state: MetaRequestState,
  init: RequestInit = {},
  attempt = 1
): Promise<T> {
  await waitForRequestSlot(state);

  const url = buildMetaUrl(pathOrUrl, accessToken);
  const response = await fetch(url, {
    method: init.method ?? "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    body: init.body,
  });

  state.requestCount += 1;
  state.lastRequestAt = Date.now();
  applyUsageCooldownFromHeaders(response.headers, state);

  const rawText = await response.text();
  const parsedJson = safeJsonParse<unknown>(rawText);
  const responseData: unknown = parsedJson ?? rawText;

  if (!response.ok) {
    const requestError = createMetaApiRequestError(
      response.status,
      responseData,
      response.headers,
      attempt
    );

    if (requestError.isRateLimit && attempt < MAX_RATE_LIMIT_RETRIES) {
      state.rateLimitRetries += 1;
      registerCooldown(state, requestError.retryAfterMs);
      await sleep(requestError.retryAfterMs);

      return fetchMetaJson<T>(pathOrUrl, accessToken, state, init, attempt + 1);
    }

    if (requestError.isTransient && attempt < MAX_TRANSIENT_RETRIES) {
      const retryWaitMs = withJitter(Math.min(30000, 1500 * 2 ** (attempt - 1)));
      registerCooldown(state, retryWaitMs);
      await sleep(retryWaitMs);

      return fetchMetaJson<T>(pathOrUrl, accessToken, state, init, attempt + 1);
    }

    throw requestError;
  }

  if (parsedJson === null) {
    throw new Error(`Meta API error ${response.status}: resposta inválida.`);
  }

  return parsedJson as T;
}

  async function fetchAllMetaPages<T>(
    pathOrUrl: string,
    accessToken: string,
    state: MetaRequestState
  ): Promise<T[]> {
    const rows: T[] = [];
    let next: string | null = pathOrUrl;

    while (next) {
      const responsePage: MetaPagedResponse<T> = await fetchMetaJson<MetaPagedResponse<T>>(
        next,
        accessToken,
        state
      );

      if (Array.isArray(responsePage.data)) {
        rows.push(...responsePage.data);
      }

      next = responsePage.paging?.next ?? null;
    }

    return rows;
  }
function buildInsightKey(row: {
  date_start?: string;
  date_stop?: string;
  campaign_id?: string;
  adset_id?: string;
}) {
  return [
    row.date_start ?? "",
    row.date_stop ?? "",
    row.campaign_id ?? "",
    row.adset_id ?? "",
  ].join("|");
}

function dedupeInsightsRows(rows: MetaInsightApi[]) {
  const deduped = new Map<string, MetaInsightApi>();

  for (const row of rows) {
    deduped.set(buildInsightKey(row), row);
  }

  return Array.from(deduped.values());
}

function extractAsyncReportId(response: MetaAsyncReportCreateResponse): string | null {
  const direct = response.report_run_id ?? response.id;
  if (typeof direct === "string" && direct.trim()) {
    return direct;
  }

  const nested = response.data?.report_run_id ?? response.data?.id;
  if (typeof nested === "string" && nested.trim()) {
    return nested;
  }

  return null;
}

async function createAsyncInsightsReport(params: {
  normalizedExternalId: string;
  accessToken: string;
  state: MetaRequestState;
  startDate: string;
  endDate: string;
  fields: string[];
  adSetIds: string[];
}): Promise<string> {
  const { normalizedExternalId, accessToken, state, startDate, endDate, fields, adSetIds } = params;

  const body = new URLSearchParams();
  body.set("level", "adset");
  body.set("time_increment", "1");
  body.set("time_range", JSON.stringify({ since: startDate, until: endDate }));
  body.set("fields", fields.join(","));
  body.set("async", "true");

  if (adSetIds.length > 0) {
    body.set(
      "filtering",
      JSON.stringify([
        {
          field: "adset.id",
          operator: "IN",
          value: adSetIds,
        },
      ])
    );
  }

  const response = await fetchMetaJson<MetaAsyncReportCreateResponse>(
    `${normalizedExternalId}/insights`,
    accessToken,
    state,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );

  const reportRunId = extractAsyncReportId(response);

  if (!reportRunId) {
    throw new Error(
      `Meta não retornou report_run_id ao criar relatório async. Resposta: ${JSON.stringify(response)}`
    );
  }

  return reportRunId;
}

function isAsyncReportCompleted(status?: string | null) {
  const normalized = (status ?? "").toLowerCase();
  return normalized.includes("complete");
}

function isAsyncReportFailed(status?: string | null) {
  const normalized = (status ?? "").toLowerCase();

  return (
    normalized.includes("fail") ||
    normalized.includes("error") ||
    normalized.includes("skip") ||
    normalized.includes("cancel")
  );
}

function getAsyncPollDelayMs(attempt: number, percent: number) {
  if (percent >= 95) return 2000;
  if (percent >= 80) return 3000;
  if (percent >= 50) return 5000;
  return Math.min(15000, 4000 + attempt * 1200);
}

async function waitForAsyncInsightsReport(
  reportRunId: string,
  accessToken: string,
  state: MetaRequestState
) {
  await sleep(ASYNC_REPORT_INITIAL_POLL_DELAY_MS);

  for (let attempt = 1; attempt <= ASYNC_REPORT_MAX_ATTEMPTS; attempt++) {
    const status = await fetchMetaJson<MetaAsyncReportStatus>(
      `${reportRunId}?fields=async_status,async_percent_completion`,
      accessToken,
      state
    );

    const asyncStatus = typeof status.async_status === "string" ? status.async_status : null;
    const percent = toNumber(status.async_percent_completion);

    if (isAsyncReportCompleted(asyncStatus)) {
      return;
    }

    if (isAsyncReportFailed(asyncStatus)) {
      throw new Error(
        `Relatório async da Meta falhou. status=${asyncStatus ?? "desconhecido"} percent=${percent}`
      );
    }

    await sleep(getAsyncPollDelayMs(attempt, percent));
  }

  throw new Error("Timeout aguardando conclusão do relatório async da Meta.");
}

async function fetchAsyncInsightsRows(
  reportRunId: string,
  accessToken: string,
  state: MetaRequestState
): Promise<MetaInsightApi[]> {
  return fetchAllMetaPages<MetaInsightApi>(
    `${reportRunId}/insights?limit=${INSIGHTS_RESULT_PAGE_LIMIT}`,
    accessToken,
    state
  );
}

function chooseTooMuchDataSplitStrategy(startDate: string, endDate: string, adSetIds: string[]) {
  const days = countDaysInclusive(startDate, endDate);

  if (days > 1 && days >= adSetIds.length) {
    return "date" as const;
  }

  if (adSetIds.length > 1) {
    return "adset" as const;
  }

  if (days > 1) {
    return "date" as const;
  }

  return null;
}

async function fetchInsightsWindowRecursively(params: {
  normalizedExternalId: string;
  accessToken: string;
  state: MetaRequestState;
  startDate: string;
  endDate: string;
  adSetIds: string[];
}): Promise<MetaInsightApi[]> {
  const { normalizedExternalId, accessToken, state, startDate, endDate, adSetIds } = params;

  if (adSetIds.length === 0) return [];

  try {
    const reportRunId = await createAsyncInsightsReport({
      normalizedExternalId,
      accessToken,
      state,
      startDate,
      endDate,
      fields: INSIGHTS_FIELDS,
      adSetIds,
    });

    await waitForAsyncInsightsReport(reportRunId, accessToken, state);
    return await fetchAsyncInsightsRows(reportRunId, accessToken, state);
  } catch (error) {
    if (isTooMuchDataError(error)) {
      const splitStrategy = chooseTooMuchDataSplitStrategy(startDate, endDate, adSetIds);

      if (splitStrategy === "date") {
        const dateRanges = splitDateRangeInclusive(startDate, endDate);

        if (dateRanges) {
          const left = await fetchInsightsWindowRecursively({
            normalizedExternalId,
            accessToken,
            state,
            startDate: dateRanges[0].startDate,
            endDate: dateRanges[0].endDate,
            adSetIds,
          });

          const right = await fetchInsightsWindowRecursively({
            normalizedExternalId,
            accessToken,
            state,
            startDate: dateRanges[1].startDate,
            endDate: dateRanges[1].endDate,
            adSetIds,
          });

          return [...left, ...right];
        }
      }

      if (splitStrategy === "adset" && adSetIds.length > 1) {
        const [leftIds, rightIds] = splitArrayInHalf(adSetIds);

        const left = await fetchInsightsWindowRecursively({
          normalizedExternalId,
          accessToken,
          state,
          startDate,
          endDate,
          adSetIds: leftIds,
        });

        const right = await fetchInsightsWindowRecursively({
          normalizedExternalId,
          accessToken,
          state,
          startDate,
          endDate,
          adSetIds: rightIds,
        });

        return [...left, ...right];
      }

      console.warn(
        `[Meta Sync] Janela ${startDate}..${endDate} com ${adSetIds.length} adsets continuou grande demais. Pulando lote. account=${normalizedExternalId}`
      );
      return [];
    }

    throw error;
  }
}

async function fetchInsightsForAccount(params: {
  normalizedExternalId: string;
  accessToken: string;
  state: MetaRequestState;
  startDate: string;
  endDate: string;
  adSetExternalIds: string[];
  allowUnfiltered?: boolean;
}): Promise<MetaInsightApi[]> {
  const {
    normalizedExternalId,
    accessToken,
    state,
    startDate,
    endDate,
    adSetExternalIds,
    allowUnfiltered = false,
  } = params;

  if (adSetExternalIds.length === 0 && !allowUnfiltered) return [];

  if (adSetExternalIds.length === 0 && allowUnfiltered) {
    const rows = await fetchInsightsWindowRecursively({
      normalizedExternalId,
      accessToken,
      state,
      startDate,
      endDate,
      adSetIds: [],
    });

    return dedupeInsightsRows(rows);
  }

  const allRows: MetaInsightApi[] = [];
  const adSetChunks = chunkArray(adSetExternalIds, INITIAL_INSIGHTS_ADSET_IDS_CHUNK_SIZE);

  for (const adSetChunk of adSetChunks) {
    const rows = await fetchInsightsWindowRecursively({
      normalizedExternalId,
      accessToken,
      state,
      startDate,
      endDate,
      adSetIds: adSetChunk,
    });

    allRows.push(...rows);
  }

  return dedupeInsightsRows(allRows);
}

function actionsToMap(actions?: MetaAction[]): Record<string, number> {
  const map: Record<string, number> = {};

  for (const action of actions ?? []) {
    if (!action?.action_type) continue;
    map[action.action_type] = (map[action.action_type] ?? 0) + toNumber(action.value);
  }

  return map;
}

function sumActionsByTypes(actionMap: Record<string, number>, actionTypes: string[]) {
  let total = 0;

  for (const actionType of actionTypes) {
    total += toNumber(actionMap[actionType] ?? 0);
  }

  return total;
}

function sumEngagements(actionMap: Record<string, number>) {
  const explicitKeys = [
    "post_engagement",
    "page_engagement",
    "post_reaction",
    "post_save",
    "comment",
    "post",
  ];

  const explicitTotal = sumActionsByTypes(actionMap, explicitKeys);

  const genericEngagementTotal = Object.entries(actionMap).reduce((sum, [key, value]) => {
    if (explicitKeys.includes(key)) return sum;
    if (key.includes("engagement")) return sum + toNumber(value);
    return sum;
  }, 0);

  return explicitTotal + genericEngagementTotal;
}

function resolveResultLabel(metrics: {
  purchases: number;
  leads: number;
  messagesStarted: number;
  landingPageViews: number;
  linkClicks: number;
  engagements: number;
}) {
  if (metrics.purchases > 0) {
    return { results: metrics.purchases, resultLabel: "Compras" };
  }

  if (metrics.leads > 0) {
    return { results: metrics.leads, resultLabel: "Leads" };
  }

  if (metrics.messagesStarted > 0) {
    return { results: metrics.messagesStarted, resultLabel: "Conversas iniciadas" };
  }

  if (metrics.landingPageViews > 0) {
    return { results: metrics.landingPageViews, resultLabel: "Landing Page Views" };
  }

  if (metrics.linkClicks > 0) {
    return { results: metrics.linkClicks, resultLabel: "Cliques no link" };
  }

  if (metrics.engagements > 0) {
    return { results: metrics.engagements, resultLabel: "Engajamentos" };
  }

  return { results: 0, resultLabel: "Resultado" };
}

async function upsertInChunks(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string
) {
  if (!supabase || rows.length === 0) return;

  for (const chunk of chunkArray(rows, UPSERT_CHUNK_SIZE)) {
    const { error } = await supabase.from(table).upsert(chunk, {
      onConflict,
      ignoreDuplicates: false,
    });

    if (error) {
      throw new Error(`Erro ao fazer upsert em ${table}: ${error.message}`);
    }
  }
}

async function insertInChunks(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  table: string,
  rows: Record<string, unknown>[]
) {
  if (!supabase || rows.length === 0) return;

  for (const chunk of chunkArray(rows, UPSERT_CHUNK_SIZE)) {
    const { error } = await supabase.from(table).insert(chunk);

    if (error) {
      throw new Error(`Erro ao inserir em ${table}: ${error.message}`);
    }
  }
}

async function loadCampaignRowsInChunks(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  adAccountId: string,
  externalIds: string[]
): Promise<CampaignDbRow[]> {
  if (!supabase || externalIds.length === 0) return [];

  const results: CampaignDbRow[] = [];

  for (const chunk of chunkArray(externalIds, SELECT_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, external_id, ad_account_id")
      .eq("ad_account_id", adAccountId)
      .in("external_id", chunk);

    if (error) {
      throw new Error(`Erro ao buscar campaigns sincronizadas: ${error.message}`);
    }

    results.push(...((data ?? []) as CampaignDbRow[]));
  }

  return results;
}

async function loadAdSetRowsInChunks(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  campaignIds: string[],
  externalIds: string[]
): Promise<AdSetDbRow[]> {
  if (!supabase || externalIds.length === 0 || campaignIds.length === 0) return [];

  const results: AdSetDbRow[] = [];
  const seen = new Set<string>();

  for (const campaignIdsChunk of chunkArray(campaignIds, SELECT_RELATION_CHUNK_SIZE)) {
    for (const externalIdsChunk of chunkArray(externalIds, SELECT_CHUNK_SIZE)) {
      const { data, error } = await supabase
        .from("ad_sets")
        .select("id, external_id, campaign_id")
        .in("campaign_id", campaignIdsChunk)
        .in("external_id", externalIdsChunk);

      if (error) {
        throw new Error(
          `Erro ao buscar ad_sets sincronizados: ${error.message} | campaignIdsChunk=${campaignIdsChunk.length} | externalIdsChunk=${externalIdsChunk.length}`
        );
      }

      for (const row of (data ?? []) as AdSetDbRow[]) {
        const key = `${row.id}::${row.external_id}::${row.campaign_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(row);
      }
    }
  }

  return results;
}

async function loadDailyMetricsSnapshot(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  workspaceId: string;
  accountId: string;
  startDate: string;
  endDate: string;
}) {
  const { supabase, workspaceId, accountId, startDate, endDate } = params;

  if (!supabase) return [];

  const { data, error } = await supabase
    .from("daily_metrics")
    .select(DAILY_METRICS_COLUMNS)
    .eq("workspace_id", workspaceId)
    .eq("ad_account_id", accountId)
    .eq("platform", PLATFORM)
    .gte("metric_date", startDate)
    .lte("metric_date", endDate);

  if (error) {
    throw new Error(`Erro ao carregar snapshot de daily_metrics: ${error.message}`);
  }

  return Array.isArray(data) ? (data as unknown as DailyMetricInsertRow[]) : [];
}


async function loadAllCampaignRowsForAccount(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  adAccountId: string
): Promise<CampaignDbRow[]> {
  if (!supabase) return [];

  const results: CampaignDbRow[] = [];
  let from = 0;

  while (true) {
    const to = from + UPSERT_CHUNK_SIZE - 1;

    const { data, error } = await supabase
      .from("campaigns")
      .select("id, external_id, ad_account_id")
      .eq("ad_account_id", adAccountId)
      .range(from, to);

    if (error) {
      throw new Error(`Erro ao carregar campaigns do banco: ${error.message}`);
    }

    const rows = (data ?? []) as CampaignDbRow[];
    results.push(...rows);

    if (rows.length < UPSERT_CHUNK_SIZE) break;
    from += UPSERT_CHUNK_SIZE;
  }

  return results;
}

async function loadAllAdSetRowsForCampaignIds(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  campaignDbIds: string[]
): Promise<AdSetDbRow[]> {
  if (!supabase || campaignDbIds.length === 0) return [];

  const deduped = new Map<string, AdSetDbRow>();

  for (const campaignIdsChunk of chunkArray(campaignDbIds, SELECT_RELATION_CHUNK_SIZE)) {
    let from = 0;

    while (true) {
      const to = from + UPSERT_CHUNK_SIZE - 1;

      const { data, error } = await supabase
        .from("ad_sets")
        .select("id, external_id, campaign_id")
        .in("campaign_id", campaignIdsChunk)
        .range(from, to);

      if (error) {
        throw new Error(`Erro ao carregar ad_sets do banco: ${error.message}`);
      }

      const rows = (data ?? []) as AdSetDbRow[];
      for (const row of rows) {
        deduped.set(row.id, row);
      }

      if (rows.length < UPSERT_CHUNK_SIZE) break;
      from += UPSERT_CHUNK_SIZE;
    }
  }

  return Array.from(deduped.values());
}

async function loadCurrentStructureMaps(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  accountId: string
): Promise<StructureMaps> {
  const campaignRows = await loadAllCampaignRowsForAccount(supabase, accountId);
  const campaignMap = new Map<string, string>();
  for (const row of campaignRows) {
    campaignMap.set(row.external_id, row.id);
  }

  const adSetRows = await loadAllAdSetRowsForCampaignIds(
    supabase,
    campaignRows.map((row) => row.id)
  );
  const adSetMap = new Map<string, string>();
  for (const row of adSetRows) {
    adSetMap.set(row.external_id, row.id);
  }

  return {
    campaignMap,
    adSetMap,
    campaignRows,
    adSetRows,
  };
}

async function getLastSuccessfulStructureRefreshAt(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  account: MetaAccountRow
): Promise<number | null> {
  const { data, error } = await supabase
    .from("sync_runs")
    .select("metadata, finished_at")
    .eq("platform", PLATFORM)
    .in("status", ["ok", "warning"])
    .contains("metadata", { accountDbId: account.id })
    .order("finished_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(`Erro ao consultar último refresh de estrutura: ${error.message}`);
  }

  for (const row of (data ?? []) as Array<{ metadata?: Record<string, unknown> | null; finished_at?: string | null }>) {
    const metadata = row.metadata ?? {};
    const structureRefreshedAt = typeof metadata.structureRefreshedAt === "string"
      ? Date.parse(metadata.structureRefreshedAt)
      : NaN;

    if (Number.isFinite(structureRefreshedAt)) {
      return structureRefreshedAt;
    }

    const fallbackFinishedAt = typeof row.finished_at === "string" ? Date.parse(row.finished_at) : NaN;
    if (Number.isFinite(fallbackFinishedAt)) {
      return fallbackFinishedAt;
    }
  }

  return null;
}

async function refreshFullStructure(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  account: MetaAccountRow;
  accessToken: string;
  state: MetaRequestState;
  normalizedExternalId: string;
}): Promise<StructureRefreshResult> {
  const { supabase, account, accessToken, state, normalizedExternalId } = params;

  const campaignsApi = await fetchAllMetaPages<MetaCampaignApi>(
    `${normalizedExternalId}/campaigns?fields=id,name,status,objective,start_time,stop_time&limit=${STRUCTURE_PAGE_LIMIT}`,
    accessToken,
    state
  );

  const campaignPayload = campaignsApi
    .filter((item) => item.id)
    .map((item) => ({
      workspace_id: account.workspace_id,
      ad_account_id: account.id,
      platform: PLATFORM,
      external_id: item.id,
      name: item.name?.trim() || `Campaign ${item.id}`,
      objective: item.objective ?? null,
      status: item.status ?? null,
      starts_at: toIsoOrNull(item.start_time),
      ends_at: toIsoOrNull(item.stop_time),
      is_active: isStructureActiveStatus(item.status),
    }));

  await upsertInChunks(supabase, "campaigns", campaignPayload, "ad_account_id,external_id");

  const campaignRows = await loadCampaignRowsInChunks(
    supabase,
    account.id,
    uniqueStrings(campaignPayload.map((row) => String(row.external_id)))
  );

  const campaignMap = new Map<string, string>();
  for (const row of campaignRows) {
    campaignMap.set(row.external_id, row.id);
  }

  const adSetsApi = await fetchAllMetaPages<MetaAdSetApi>(
    `${normalizedExternalId}/adsets?fields=id,name,status,campaign_id,start_time,end_time&limit=${STRUCTURE_PAGE_LIMIT}`,
    accessToken,
    state
  );

  const adSetPayload = adSetsApi
    .filter((item) => item.id && item.campaign_id && campaignMap.has(item.campaign_id))
    .map((item) => ({
      campaign_id: campaignMap.get(item.campaign_id as string)!,
      external_id: item.id,
      name: item.name?.trim() || `Ad Set ${item.id}`,
      status: item.status ?? null,
      starts_at: toIsoOrNull(item.start_time),
      ends_at: toIsoOrNull(item.end_time),
    }));

  await upsertInChunks(supabase, "ad_sets", adSetPayload, "campaign_id,external_id");

  const adSetRows = await loadAdSetRowsInChunks(
    supabase,
    Array.from(campaignMap.values()),
    uniqueStrings(adSetPayload.map((row) => String(row.external_id)))
  );

  const adSetMap = new Map<string, string>();
  for (const row of adSetRows) {
    adSetMap.set(row.external_id, row.id);
  }

  return {
    refreshed: true,
    campaignsSynced: campaignPayload.length,
    adSetsSynced: adSetPayload.length,
    campaignMap,
    adSetMap,
    campaignRows,
    adSetRows,
  };
}

function collectMissingIdsFromInsights(
  insightsRows: MetaInsightApi[],
  campaignMap: Map<string, string>,
  adSetMap: Map<string, string>
) {
  const missingCampaignIds = new Set<string>();
  const missingAdSetIds = new Set<string>();

  for (const row of insightsRows) {
    if (row.campaign_id && !campaignMap.has(row.campaign_id)) {
      missingCampaignIds.add(row.campaign_id);
    }

    if (row.adset_id && !adSetMap.has(row.adset_id)) {
      missingAdSetIds.add(row.adset_id);
    }
  }

  return {
    missingCampaignIds: Array.from(missingCampaignIds),
    missingAdSetIds: Array.from(missingAdSetIds),
  };
}

async function replaceDailyMetricsRange(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  workspaceId: string;
  accountId: string;
  startDate: string;
  endDate: string;
  rows: DailyMetricInsertRow[];
}) {
  const { supabase, workspaceId, accountId, startDate, endDate, rows } = params;

  if (!supabase) {
    throw new Error("Supabase admin não configurado.");
  }

  const previousRows = await loadDailyMetricsSnapshot({
    supabase,
    workspaceId,
    accountId,
    startDate,
    endDate,
  });

  const deleteRange = async () => {
    const { error } = await supabase
      .from("daily_metrics")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("ad_account_id", accountId)
      .eq("platform", PLATFORM)
      .gte("metric_date", startDate)
      .lte("metric_date", endDate);

    if (error) {
      throw new Error(`Erro ao limpar daily_metrics do intervalo: ${error.message}`);
    }
  };

  await deleteRange();

  try {
    await insertInChunks(
      supabase,
      "daily_metrics",
      rows as unknown as Record<string, unknown>[]
    );
  } catch (insertError) {
    try {
      await deleteRange();

      if (previousRows.length > 0) {
        await insertInChunks(
          supabase,
          "daily_metrics",
          previousRows as unknown as Record<string, unknown>[]
        );
      }
    } catch (restoreError) {
      const insertMessage = insertError instanceof Error ? insertError.message : String(insertError);
      const restoreMessage = restoreError instanceof Error ? restoreError.message : String(restoreError);

      throw new Error(
        `Falha ao substituir daily_metrics. Inserção nova falhou: ${insertMessage}. Restauração do snapshot também falhou: ${restoreMessage}`
      );
    }

    throw insertError;
  }
}

async function findRunningSyncsForAccount(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  accountId: string
): Promise<SyncRunRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("sync_runs")
    .select("id, started_at, metadata")
    .eq("platform", PLATFORM)
    .eq("status", "running")
    .order("started_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Erro ao verificar sync_runs em execução: ${error.message}`);
  }

  return ((data ?? []) as SyncRunRow[]).filter((row) => {
    const metadata = row.metadata ?? {};
    return metadata?.accountDbId === accountId;
  });
}

async function closeStaleRunningSyncs(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  staleRunIds: string[]
) {
  if (!supabase || staleRunIds.length === 0) return;

  const { error } = await supabase
    .from("sync_runs")
    .update({
      status: "error",
      finished_at: new Date().toISOString(),
      error_message: "Sync encerrada automaticamente por estar travada em status running antes de uma nova execução.",
    })
    .in("id", staleRunIds);

  if (error) {
    throw new Error(`Erro ao encerrar sync_runs travadas: ${error.message}`);
  }
}

async function ensureNoRecentRunningSync(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  accountId: string
) {
  const runningSyncs = await findRunningSyncsForAccount(supabase, accountId);

  if (runningSyncs.length === 0) {
    return { blockedByRunId: null as string | null };
  }

  const now = Date.now();
  const staleRunIds: string[] = [];
  let recentRunningRunId: string | null = null;

  for (const run of runningSyncs) {
    const startedAtMs = run.started_at ? new Date(run.started_at).getTime() : 0;

    if (!startedAtMs || now - startedAtMs > RUNNING_SYNC_STALE_AFTER_MS) {
      staleRunIds.push(run.id);
      continue;
    }

    recentRunningRunId = run.id;
    break;
  }

  if (staleRunIds.length > 0) {
    await closeStaleRunningSyncs(supabase, staleRunIds);
  }

  return { blockedByRunId: recentRunningRunId };
}

async function createSyncRun(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  account: MetaAccountRow,
  startDate: string,
  endDate: string
) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("sync_runs")
    .insert({
      workspace_id: account.workspace_id,
      platform: PLATFORM,
      status: "running",
      started_at: new Date().toISOString(),
      metadata: {
        accountDbId: account.id,
        accountExternalId: account.external_id,
        accountName: account.name,
        startDate,
        endDate,
        strategy: "meta_metrics_first_router_v6",
      },
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Erro ao criar sync_run: ${error.message}`);
  }

  return data?.id ?? null;
}

async function finalizeSyncRun(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  syncRunId: string | null,
  payload: {
    status: "ok" | "error" | "warning";
    inserted_rows: number;
    error_message?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  if (!supabase || !syncRunId) return;

  const { error } = await supabase
    .from("sync_runs")
    .update({
      status: payload.status,
      finished_at: new Date().toISOString(),
      inserted_rows: payload.inserted_rows,
      error_message: payload.error_message ?? null,
      metadata: payload.metadata ?? {},
    })
    .eq("id", syncRunId);

  if (error) {
    throw new Error(`Erro ao atualizar sync_run: ${error.message}`);
  }
}

function buildDailyMetricsPayload(params: {
  account: MetaAccountRow;
  insightsRows: MetaInsightApi[];
  campaignMap: Map<string, string>;
  adSetMap: Map<string, string>;
}): DailyMetricInsertRow[] {
  const { account, insightsRows, campaignMap, adSetMap } = params;

  return insightsRows
    .filter((row) => row.date_start)
    .map((row) => {
      const actionMap = actionsToMap(row.actions);
      const actionValueMap = actionsToMap(row.action_values);

      const impressions = toInteger(row.impressions);
      const reach = toInteger(row.reach);
      const clicks = toInteger(row.clicks);
      const spend = toNumber(row.spend);
      const ctr = toNumber(row.ctr);
      const cpm = toNumber(row.cpm);
      const cpc = toNumber(row.cpc);

      const linkClicks = sumActionsByTypes(actionMap, LINK_CLICK_ACTION_TYPES);
      const landingPageViews = sumActionsByTypes(actionMap, LANDING_PAGE_VIEW_ACTION_TYPES);
      const messagesStarted = sumActionsByTypes(actionMap, MESSAGE_ACTION_TYPES);
      const leads = sumActionsByTypes(actionMap, LEAD_ACTION_TYPES);
      const checkouts = sumActionsByTypes(actionMap, CHECKOUT_ACTION_TYPES);
      const purchases = sumActionsByTypes(actionMap, PURCHASE_ACTION_TYPES);
      const engagements = sumEngagements(actionMap);
      const revenue = sumActionsByTypes(actionValueMap, PURCHASE_ACTION_TYPES);

      const { results, resultLabel } = resolveResultLabel({
        purchases,
        leads,
        messagesStarted,
        landingPageViews,
        linkClicks,
        engagements,
      });

      return {
        workspace_id: account.workspace_id,
        ad_account_id: account.id,
        campaign_id: row.campaign_id ? campaignMap.get(row.campaign_id) ?? null : null,
        ad_set_id: row.adset_id ? adSetMap.get(row.adset_id) ?? null : null,
        ad_id: null,
        platform: PLATFORM,
        metric_date: row.date_start as string,
        impressions,
        reach,
        clicks,
        link_clicks: toInteger(linkClicks),
        landing_page_views: toInteger(landingPageViews),
        messages_started: toInteger(messagesStarted),
        engagements: toInteger(engagements),
        leads: toInteger(leads),
        checkouts: toInteger(checkouts),
        purchases: toInteger(purchases),
        results: toInteger(results),
        result_label: resultLabel,
        spend: Number(spend.toFixed(2)),
        revenue: Number(revenue.toFixed(2)),
        video_views_25: 0,
        video_views_50: 0,
        video_views_75: 0,
        video_views_100: 0,
        ctr: Number(ctr.toFixed(4)),
        cpm: Number(cpm.toFixed(4)),
        cpc: Number(cpc.toFixed(4)),
        cost_per_result: results > 0 ? Number((spend / results).toFixed(4)) : 0,
      };
    });
}

function shouldDeferAdsSync(state: MetaRequestState) {
  return state.rateLimitRetries > 0 || getPeakUsagePercent(state) >= 85;
}

async function syncAdsStructureBestEffort(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  account: MetaAccountRow;
  accessToken: string;
  state: MetaRequestState;
  normalizedExternalId: string;
  adSetMap: Map<string, string>;
  activeCampaignAdSetIdsMap: Map<string, string[]>;
}): Promise<{ adsSynced: number; warning?: string }> {
  const {
    supabase,
    account,
    accessToken,
    state,
    normalizedExternalId,
    adSetMap,
    activeCampaignAdSetIdsMap,
  } = params;

  if (shouldDeferAdsSync(state)) {
    return {
      adsSynced: 0,
      warning:
        "Sincronização de ads foi adiada nesta execução para preservar a cota da Meta; métricas, campanhas e conjuntos foram sincronizados normalmente.",
    };
  }

  if (activeCampaignAdSetIdsMap.size === 0) {
    return { adsSynced: 0 };
  }

  const payloadByKey = new Map<
    string,
    {
      ad_set_id: string;
      external_id: string;
      name: string;
      creative_name: string | null;
      status: string | null;
      preview_url: null;
      thumbnail_url: string | null;
    }
  >();

  const persistPartialPayload = async () => {
    const partialPayload = Array.from(payloadByKey.values());
    if (partialPayload.length > 0) {
      await upsertInChunks(supabase, "ads", partialPayload, "ad_set_id,external_id");
    }
    return partialPayload.length;
  };

  const mapAdRows = (rows: MetaAdApi[], allowedAdSetIds: Set<string>) => {
    for (const item of rows) {
      if (!item.id || !item.adset_id) continue;
      if (!allowedAdSetIds.has(item.adset_id)) continue;

      const adSetDbId = adSetMap.get(item.adset_id);
      if (!adSetDbId) continue;

      const key = `${adSetDbId}::${item.id}`;
      payloadByKey.set(key, {
        ad_set_id: adSetDbId,
        external_id: item.id,
        name: item.name?.trim() || `Ad ${item.id}`,
        creative_name: item.creative?.name ?? null,
        status: item.status ?? null,
        preview_url: null,
        thumbnail_url: item.creative?.thumbnail_url ?? null,
      });
    }
  };

  try {
    for (const [campaignExternalId, activeAdSetIds] of activeCampaignAdSetIdsMap.entries()) {
      if (activeAdSetIds.length === 0) continue;

      if (shouldDeferAdsSync(state)) {
        const adsSynced = await persistPartialPayload();
        return {
          adsSynced,
          warning:
            "Sincronização de ads foi parcialmente interrompida para preservar a cota da Meta; métricas, campanhas e conjuntos já foram sincronizados.",
        };
      }

      const allowedAdSetIds = new Set(activeAdSetIds);

      try {
        const campaignAds = await fetchAllMetaPages<MetaAdApi>(
          `${campaignExternalId}/ads?fields=id,name,status,adset_id&limit=${ADS_STRUCTURE_PAGE_LIMIT}`,
          accessToken,
          state
        );

        mapAdRows(campaignAds, allowedAdSetIds);
        continue;
      } catch (error) {
        if (!isTooMuchDataError(error)) {
          throw error;
        }
      }

      for (const adSetExternalId of activeAdSetIds) {
        if (shouldDeferAdsSync(state)) {
          const adsSynced = await persistPartialPayload();
          return {
            adsSynced,
            warning:
              "Sincronização de ads foi parcialmente interrompida para preservar a cota da Meta; métricas, campanhas e conjuntos já foram sincronizados.",
          };
        }

        const adSetAds = await fetchAllMetaPages<MetaAdApi>(
          `${adSetExternalId}/ads?fields=id,name,status,adset_id&limit=${ADS_STRUCTURE_PAGE_LIMIT}`,
          accessToken,
          state
        );

        mapAdRows(adSetAds, new Set([adSetExternalId]));
      }
    }

    const adsSynced = await persistPartialPayload();
    return { adsSynced };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[Meta Sync] Falha não-bloqueante ao sincronizar ads da conta ${account.id} (${normalizedExternalId}): ${message}`
    );

    try {
      const adsSynced = await persistPartialPayload();
      return {
        adsSynced,
        warning: `Falha não-bloqueante ao sincronizar estrutura de ads: ${message}`,
      };
    } catch (upsertError) {
      const upsertMessage = upsertError instanceof Error ? upsertError.message : String(upsertError);
      return {
        adsSynced: 0,
        warning: `Falha não-bloqueante ao sincronizar estrutura de ads: ${message}. Também falhou ao persistir ads parciais: ${upsertMessage}`,
      };
    }
  }
}

async function syncSingleMetaAccount(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  account: MetaAccountRow;
  accessToken: string;
  startDate: string;
  endDate: string;
  mode: SyncMode;
  forceStructureRefresh: boolean;
  syncAds: boolean;
}): Promise<SyncAccountResult> {
  const {
    supabase,
    account,
    accessToken,
    startDate,
    endDate,
    mode,
    forceStructureRefresh,
    syncAds,
  } = params;

  if (!supabase) {
    throw new Error("Supabase admin não configurado.");
  }

  const runningSyncCheck = await ensureNoRecentRunningSync(supabase, account.id);

  if (runningSyncCheck.blockedByRunId) {
    return {
      ok: false,
      skipped: true,
      warnings: [
        `Conta ignorada porque já existe uma sincronização ativa recente (${runningSyncCheck.blockedByRunId}). Isso evita sobreposição de jobs e explosão de chamadas na Meta.`,
      ],
      accountDbId: account.id,
      accountNameInDb: account.name,
      externalId: account.external_id,
      normalizedExternalId: normalizeMetaAccountExternalId(account.external_id),
      dateRange: {
        startDate,
        endDate,
      },
      error: "Já existe uma sincronização em execução para esta conta.",
    };
  }

  const normalizedExternalId = normalizeMetaAccountExternalId(account.external_id);
  const requestState: MetaRequestState = {
    nextAllowedAt: 0,
    lastRequestAt: 0,
    requestCount: 0,
    rateLimitRetries: 0,
    usageSignals: [],
  };

  const warnings: string[] = [];
  let syncRunId: string | null = null;

  try {
    syncRunId = await createSyncRun(supabase, account, startDate, endDate);

    const accountInfo = await fetchMetaJson<MetaAccountInfo>(
      `${normalizedExternalId}?fields=id,name,account_status,currency,timezone_name`,
      accessToken,
      requestState
    );

    const { error: accountUpdateError } = await supabase
      .from("ad_accounts")
      .update({
        name: (accountInfo.name as string | undefined) ?? account.name ?? normalizedExternalId,
        currency: (accountInfo.currency as string | undefined) ?? account.currency ?? "BRL",
        timezone:
          (accountInfo.timezone_name as string | undefined) ??
          account.timezone ??
          "America/Sao_Paulo",
      })
      .eq("id", account.id);

    if (accountUpdateError) {
      throw new Error(`Erro ao atualizar ad_accounts: ${accountUpdateError.message}`);
    }

    let structure = await loadCurrentStructureMaps(supabase, account.id);
    let campaignsSynced = 0;
    let adSetsSynced = 0;
    let structureRefreshed = false;

    const lastStructureRefreshAt = await getLastSuccessfulStructureRefreshAt(supabase, account);
    const structureIsStale =
      !lastStructureRefreshAt ||
      Date.now() - lastStructureRefreshAt > REALTIME_STRUCTURE_REFRESH_MAX_AGE_MS;

    const shouldRefreshStructureInitially =
      forceStructureRefresh ||
      mode === "backfill" ||
      structure.campaignMap.size === 0 ||
      structure.adSetMap.size === 0 ||
      structureIsStale;

    if (shouldRefreshStructureInitially) {
      const refreshed = await refreshFullStructure({
        supabase,
        account,
        accessToken,
        state: requestState,
        normalizedExternalId,
      });

      structure = refreshed;
      campaignsSynced = refreshed.campaignsSynced;
      adSetsSynced = refreshed.adSetsSynced;
      structureRefreshed = true;
    }

    const allowUnfilteredInsights = mode === "realtime";
    const insightsApi = await fetchInsightsForAccount({
      normalizedExternalId,
      accessToken,
      state: requestState,
      startDate,
      endDate,
      adSetExternalIds: allowUnfilteredInsights ? [] : Array.from(structure.adSetMap.keys()),
      allowUnfiltered: allowUnfilteredInsights,
    });

    const missingIds = collectMissingIdsFromInsights(
      insightsApi,
      structure.campaignMap,
      structure.adSetMap
    );

    if (
      (missingIds.missingCampaignIds.length > 0 || missingIds.missingAdSetIds.length > 0) &&
      !structureRefreshed
    ) {
      const refreshed = await refreshFullStructure({
        supabase,
        account,
        accessToken,
        state: requestState,
        normalizedExternalId,
      });

      structure = refreshed;
      campaignsSynced = Math.max(campaignsSynced, refreshed.campaignsSynced);
      adSetsSynced = Math.max(adSetsSynced, refreshed.adSetsSynced);
      structureRefreshed = true;

      warnings.push(
        `Estrutura atualizada após detectar ${missingIds.missingCampaignIds.length} campaigns e ${missingIds.missingAdSetIds.length} adsets novos nos insights.`
      );
    }

    const dailyMetricsPayload = buildDailyMetricsPayload({
      account,
      insightsRows: insightsApi,
      campaignMap: structure.campaignMap,
      adSetMap: structure.adSetMap,
    });

    await replaceDailyMetricsRange({
      supabase,
      workspaceId: account.workspace_id,
      accountId: account.id,
      startDate,
      endDate,
      rows: dailyMetricsPayload,
    });

    const activeCampaignAdSetIdsSets = new Map<string, Set<string>>();
    for (const row of insightsApi) {
      if (!row.campaign_id || !row.adset_id) continue;

      let adSetIds = activeCampaignAdSetIdsSets.get(row.campaign_id);
      if (!adSetIds) {
        adSetIds = new Set<string>();
        activeCampaignAdSetIdsSets.set(row.campaign_id, adSetIds);
      }

      adSetIds.add(row.adset_id);
    }

    const activeCampaignAdSetIdsMap = new Map<string, string[]>();
    for (const [campaignExternalId, adSetIds] of activeCampaignAdSetIdsSets.entries()) {
      activeCampaignAdSetIdsMap.set(campaignExternalId, Array.from(adSetIds));
    }

    let adsSynced = 0;
    if (syncAds && mode === "backfill") {
      const adsSync = await syncAdsStructureBestEffort({
        supabase,
        account,
        accessToken,
        state: requestState,
        normalizedExternalId,
        adSetMap: structure.adSetMap,
        activeCampaignAdSetIdsMap,
      });

      adsSynced = adsSync.adsSynced;
      if (adsSync.warning) {
        warnings.push(adsSync.warning);
      }
    } else if (mode === "realtime") {
      warnings.push(
        "Sync de ads foi desativada nesta execução em modo realtime para priorizar atualização rápida das métricas."
      );
    }

    const insertedRows =
      campaignsSynced +
      adSetsSynced +
      adsSynced +
      dailyMetricsPayload.length;

    const peakUsagePercent = getPeakUsagePercent(requestState);
    const syncStatus = warnings.length > 0 ? "warning" : "ok";

    await finalizeSyncRun(supabase, syncRunId, {
      status: syncStatus,
      inserted_rows: insertedRows,
      error_message: warnings.length > 0 ? warnings.join(" | ") : null,
      metadata: {
        accountDbId: account.id,
        accountExternalId: normalizedExternalId,
        accountName: account.name,
        startDate,
        endDate,
        mode,
        strategy:
          mode === "realtime"
            ? "meta_realtime_light_metrics_first_v6"
            : "meta_backfill_usage_aware_v6",
        warnings,
        structureRefreshedAt: structureRefreshed ? new Date().toISOString() : null,
        counts: {
          campaigns: campaignsSynced,
          adSets: adSetsSynced,
          ads: adsSynced,
          dailyMetrics: dailyMetricsPayload.length,
          activeCampaignsInWindow: activeCampaignAdSetIdsMap.size,
          activeAdSetsInWindow: Array.from(activeCampaignAdSetIdsMap.values()).reduce(
            (sum, ids) => sum + ids.length,
            0
          ),
        },
        requestStats: {
          requestCount: requestState.requestCount,
          rateLimitRetries: requestState.rateLimitRetries,
          peakUsagePercent,
          usageSignals: requestState.usageSignals,
        },
      },
    });

    return {
      ok: true,
      warnings,
      accountDbId: account.id,
      accountNameInDb: account.name,
      externalId: account.external_id,
      normalizedExternalId,
      syncRunId,
      dateRange: {
        startDate,
        endDate,
      },
      campaignsSynced,
      adSetsSynced,
      adsSynced,
      dailyMetricsInserted: dailyMetricsPayload.length,
      metaRequestCount: requestState.requestCount,
      rateLimitRetries: requestState.rateLimitRetries,
      peakUsagePercent,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido ao sincronizar conta Meta.";

    await finalizeSyncRun(supabase, syncRunId, {
      status: "error",
      inserted_rows: 0,
      error_message: message,
      metadata: {
        accountDbId: account.id,
        accountExternalId: normalizedExternalId,
        accountName: account.name,
        startDate,
        endDate,
        mode,
        strategy:
          mode === "realtime"
            ? "meta_realtime_light_metrics_first_v6"
            : "meta_backfill_usage_aware_v6",
        requestStats: {
          requestCount: requestState.requestCount,
          rateLimitRetries: requestState.rateLimitRetries,
          peakUsagePercent: getPeakUsagePercent(requestState),
          usageSignals: requestState.usageSignals,
        },
      },
    });

    return {
      ok: false,
      accountDbId: account.id,
      accountNameInDb: account.name,
      externalId: account.external_id,
      normalizedExternalId,
      syncRunId,
      dateRange: {
        startDate,
        endDate,
      },
      metaRequestCount: requestState.requestCount,
      rateLimitRetries: requestState.rateLimitRetries,
      peakUsagePercent: getPeakUsagePercent(requestState),
      error: message,
    };
  }
}

async function handleSync(request: NextRequest) {
  ensureSyncAuthorization(request);

  const accessToken = readEnv("META_ACCESS_TOKEN");

  if (!accessToken) {
    return NextResponse.json(
      {
        ok: false,
        error: "META_ACCESS_TOKEN não configurado.",
        diagnostics: {
          supabase: getSupabaseConfigDiagnostics(),
          usingServiceRole: isSupabaseUsingServiceRole()
        }
      },
      { status: 500 }
    );
  }

  const supabase = assertSupabaseServerDataClient();

  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase não configurado para sincronização.",
        diagnostics: {
          supabase: getSupabaseConfigDiagnostics(),
          usingServiceRole: isSupabaseUsingServiceRole()
        }
      },
      { status: 500 }
    );
  }

  const syncPlan = getSyncPlan(request);
  const { startDate, endDate, mode, forceStructureRefresh, syncAds } = syncPlan;
  const accountIdFilter = getOptionalAccountFilter(request);

  let accountsQuery = supabase
    .from("ad_accounts")
    .select("id, workspace_id, platform, external_id, name, currency, timezone, is_active")
    .eq("platform", PLATFORM)
    .eq("is_active", true);

  if (accountIdFilter) {
    accountsQuery = accountsQuery.eq("id", accountIdFilter);
  }

  const { data: accounts, error: accountsError } = await accountsQuery.order("name", {
    ascending: true,
  });

  if (accountsError) {
    return NextResponse.json(
      { ok: false, error: `Erro ao buscar ad_accounts: ${accountsError.message}` },
      { status: 500 }
    );
  }

  const metaAccounts = (accounts ?? []) as MetaAccountRow[];

  if (metaAccounts.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Nenhuma conta Meta ativa encontrada para sincronização." },
      { status: 404 }
    );
  }

  const results: SyncAccountResult[] = [];

  for (const account of metaAccounts) {
    const result = await syncSingleMetaAccount({
      supabase,
      account,
      accessToken,
      startDate,
      endDate,
      mode,
      forceStructureRefresh,
      syncAds,
    });

    results.push(result);
  }

  const successCount = results.filter((item) => item.ok).length;
  const skippedCount = results.filter((item) => item.skipped).length;
  const failureCount = results.filter((item) => !item.ok && !item.skipped).length;

  return NextResponse.json({
    ok: failureCount === 0,
    platform: PLATFORM,
    mode,
    startDate,
    endDate,
    syncedAccounts: successCount,
    skippedAccounts: skippedCount,
    failedAccounts: failureCount,
    diagnostics: {
      supabase: getSupabaseConfigDiagnostics(),
      usingServiceRole: isSupabaseUsingServiceRole()
    },
    results,
  });
}

export async function POST(request: NextRequest) {
  try {
    return await handleSync(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido na sincronização Meta.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        diagnostics: {
          supabase: getSupabaseConfigDiagnostics(),
          usingServiceRole: isSupabaseUsingServiceRole()
        }
      },
      { status: message === "Não autorizado." ? 401 : 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    return await handleSync(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido na sincronização Meta.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        diagnostics: {
          supabase: getSupabaseConfigDiagnostics(),
          usingServiceRole: isSupabaseUsingServiceRole()
        }
      },
      { status: message === "Não autorizado." ? 401 : 500 }
    );
  }
}
