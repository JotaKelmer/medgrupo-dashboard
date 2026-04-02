import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getSupabaseConfigDiagnostics,
  isSupabaseUsingServiceRole
} from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const PLATFORM = "google" as const;
const GOOGLE_ADS_API_VERSION = "v23";
const DASHBOARD_TIMEZONE = "America/Sao_Paulo";
const DEFAULT_REALTIME_DAYS = 2;
const MAX_REPORT_WINDOW_DAYS = 31;
const UPSERT_CHUNK_SIZE = 500;
const SELECT_CHUNK_SIZE = 100;
const SELECT_RELATION_CHUNK_SIZE = 25;
const MAX_API_RETRIES = 5;
const BASE_BACKOFF_MS = 1500;
const RUNNING_SYNC_WINDOW_MINUTES = 30;
const STALE_RUNNING_SYNC_HOURS = 2;

type GoogleAccountRow = {
  id: string;
  workspace_id: string;
  platform: "meta" | "google";
  external_id: string;
  name: string | null;
  currency: string | null;
  timezone: string | null;
  is_active: boolean | null;
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

type AdDbRow = {
  id: string;
  external_id: string;
  ad_set_id: string;
};

type SyncMode = "realtime" | "backfill";

type DateWindow = {
  startDate: string;
  endDate: string;
};

type SyncPlan = DateWindow & {
  mode: SyncMode;
  forceStructureRefresh: boolean;
  syncAds: boolean;
};

type SyncAccountResult = {
  ok: boolean;
  skipped?: boolean;
  accountDbId: string;
  accountNameInDb: string | null;
  externalId: string;
  normalizedExternalId: string;
  syncRunId?: string | null;
  dateRange: DateWindow;
  mode: SyncMode;
  warnings: string[];
  campaignsSynced: number;
  adSetsSynced: number;
  adsSynced: number;
  dailyMetricsInserted: number;
  windowCount: number;
  requestCount: number;
  retries: number;
  dbClientMode: string;
  error?: string;
};

type GoogleAdsApiErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<Record<string, unknown>>;
  };
};

type GoogleSearchStreamBatch = {
  results?: GoogleAdsRow[];
  fieldMask?: string;
  queryResourceConsumption?: string | number;
  requestId?: string;
};

type GoogleAdsRow = {
  campaign?: {
    id?: string | number;
    name?: string;
    status?: string;
    advertisingChannelType?: string;
  };
  adGroup?: {
    id?: string | number;
    name?: string;
    status?: string;
  };
  adGroupAd?: {
    ad?: {
      id?: string | number;
      name?: string;
      finalUrls?: string[];
      type?: string;
      resourceName?: string;
    };
    status?: string;
  };
  metrics?: {
    impressions?: string | number;
    clicks?: string | number;
    costMicros?: string | number;
    ctr?: string | number;
    averageCpc?: string | number;
    averageCpm?: string | number;
    conversions?: string | number;
    conversionsValue?: string | number;
    interactions?: string | number;
  };
  segments?: {
    date?: string;
  };
};

type RequestState = {
  requestCount: number;
  retries: number;
  queryResourceConsumption: number;
};

type GoogleAdsApiError = Error & {
  httpStatus?: number;
  retryable?: boolean;
  tooMuchData?: boolean;
  rawBody?: unknown;
};

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function nowInDashboardTimezone() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DASHBOARD_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function normalizeGoogleCustomerId(externalId: string): string {
  return externalId.replace(/\D/g, "");
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

function toMoneyFromMicros(value: unknown): number {
  return Number((toNumber(value) / 1_000_000).toFixed(2));
}

function addDays(dateString: string, delta: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function getDaysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  return Math.floor((end - start) / 86_400_000) + 1;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(base: number) {
  return Math.round(base * (0.85 + Math.random() * 0.3));
}

function escapeGaqlString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function buildDateCondition(window: DateWindow) {
  return `segments.date BETWEEN '${window.startDate}' AND '${window.endDate}'`;
}

function getSyncPlan(request: Request): SyncPlan {
  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate")?.trim() || "";
  const endDate = url.searchParams.get("endDate")?.trim() || "";
  const requestedMode = url.searchParams.get("mode")?.trim();
  const forceStructureRefresh = url.searchParams.get("forceStructure") === "1";
  const syncAds = ["1", "true", "yes"].includes(
    url.searchParams.get("syncAds")?.trim().toLowerCase() ?? ""
  );

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
      mode: requestedMode === "realtime" ? "realtime" : "backfill",
      forceStructureRefresh,
      syncAds
    };
  }

  const end = nowInDashboardTimezone();
  const start = addDays(end, -(DEFAULT_REALTIME_DAYS - 1));

  return {
    startDate: start,
    endDate: end,
    mode: requestedMode === "backfill" ? "backfill" : "realtime",
    forceStructureRefresh,
    syncAds: requestedMode === "backfill" ? syncAds : false
  };
}

function getOptionalAccountFilter(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("accountId")?.trim() || null;
}

function splitDateRange(startDate: string, endDate: string, maxDaysPerWindow: number): DateWindow[] {
  const windows: DateWindow[] = [];
  let currentStart = startDate;

  while (currentStart <= endDate) {
    const currentEnd = addDays(currentStart, maxDaysPerWindow - 1);
    const resolvedEnd = currentEnd < endDate ? currentEnd : endDate;
    windows.push({ startDate: currentStart, endDate: resolvedEnd });
    currentStart = addDays(resolvedEnd, 1);
  }

  return windows;
}

function splitWindowInHalf(window: DateWindow): [DateWindow, DateWindow] {
  const totalDays = getDaysBetween(window.startDate, window.endDate);
  const leftDays = Math.max(1, Math.floor(totalDays / 2));
  const leftEnd = addDays(window.startDate, leftDays - 1);
  const rightStart = addDays(leftEnd, 1);

  return [
    { startDate: window.startDate, endDate: leftEnd },
    { startDate: rightStart, endDate: window.endDate }
  ];
}

function createGoogleAdsApiError(message: string, options?: Partial<GoogleAdsApiError>): GoogleAdsApiError {
  const error = new Error(message) as GoogleAdsApiError;
  Object.assign(error, options);
  return error;
}

function classifyGoogleAdsApiError(httpStatus: number, body: unknown) {
  const payload = (body ?? {}) as GoogleAdsApiErrorPayload;
  const apiError = payload.error;
  const message = apiError?.message ?? `Google Ads API error ${httpStatus}`;
  const status = apiError?.status ?? "";
  const normalizedMessage = `${message} ${status}`.toLowerCase();
  const retryableStatuses = new Set(["RESOURCE_EXHAUSTED", "UNAVAILABLE", "DEADLINE_EXCEEDED", "INTERNAL"]);
  const retryable =
    httpStatus === 429 ||
    httpStatus >= 500 ||
    retryableStatuses.has(status) ||
    normalizedMessage.includes("resource exhausted") ||
    normalizedMessage.includes("temporarily unavailable") ||
    normalizedMessage.includes("deadline exceeded");
  const tooMuchData =
    normalizedMessage.includes("resource exhausted") ||
    normalizedMessage.includes("too many") ||
    normalizedMessage.includes("request size") ||
    normalizedMessage.includes("response size") ||
    normalizedMessage.includes("internal error encountered");

  return createGoogleAdsApiError(
    `Google Ads API error ${httpStatus}${status ? ` | status=${status}` : ""}: ${message}`,
    {
      httpStatus,
      retryable,
      tooMuchData,
      rawBody: body
    }
  );
}

async function getGoogleAccessToken() {
  const clientId = readEnv("GOOGLE_ADS_CLIENT_ID");
  const clientSecret = readEnv("GOOGLE_ADS_CLIENT_SECRET");
  const refreshToken = readEnv("GOOGLE_ADS_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    const missing = [
      !clientId ? "GOOGLE_ADS_CLIENT_ID" : null,
      !clientSecret ? "GOOGLE_ADS_CLIENT_SECRET" : null,
      !refreshToken ? "GOOGLE_ADS_REFRESH_TOKEN" : null
    ].filter(Boolean);
    throw new Error(`Credenciais OAuth do Google Ads não configuradas: ${missing.join(", ")}.`);
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });

  for (let attempt = 0; attempt <= 2; attempt += 1) {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body,
      cache: "no-store"
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data?.access_token) {
      return String(data.access_token);
    }

    if (attempt < 2 && response.status >= 500) {
      await sleep(jitter(BASE_BACKOFF_MS * (attempt + 1)));
      continue;
    }

    throw new Error(`Erro ao gerar access token do Google: ${JSON.stringify(data)}`);
  }

  throw new Error("Falha inesperada ao gerar access token do Google.");
}

async function googleAdsSearchStream(params: {
  customerId: string;
  query: string;
  accessToken: string;
  developerToken: string;
  loginCustomerId?: string | null;
  requestState: RequestState;
}): Promise<GoogleAdsRow[]> {
  const { customerId, query, accessToken, developerToken, loginCustomerId, requestState } = params;

  for (let attempt = 0; attempt <= MAX_API_RETRIES; attempt += 1) {
    requestState.requestCount += 1;

    const response = await fetch(
      `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:searchStream`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "developer-token": developerToken,
          ...(loginCustomerId ? { "login-customer-id": loginCustomerId } : {})
        },
        body: JSON.stringify({ query })
      }
    );

    const text = await response.text();
    let parsedBody: unknown = [];

    try {
      parsedBody = text ? JSON.parse(text) : [];
    } catch {
      parsedBody = { raw: text };
    }

    if (!response.ok) {
      const apiError = classifyGoogleAdsApiError(response.status, parsedBody);

      if (apiError.retryable && attempt < MAX_API_RETRIES) {
        requestState.retries += 1;
        await sleep(jitter(BASE_BACKOFF_MS * 2 ** attempt));
        continue;
      }

      throw apiError;
    }

    if (!Array.isArray(parsedBody)) {
      throw createGoogleAdsApiError("Resposta inesperada do Google Ads SearchStream.", {
        httpStatus: response.status,
        rawBody: parsedBody
      });
    }

    const rows: GoogleAdsRow[] = [];
    for (const batch of parsedBody as GoogleSearchStreamBatch[]) {
      requestState.queryResourceConsumption += toNumber(batch.queryResourceConsumption);
      if (Array.isArray(batch.results)) {
        rows.push(...batch.results);
      }
    }

    return rows;
  }

  throw createGoogleAdsApiError("Falha inesperada no SearchStream do Google Ads.");
}

async function runAdaptiveSearchStream(params: {
  customerId: string;
  queryBuilder: (window: DateWindow) => string;
  accessToken: string;
  developerToken: string;
  loginCustomerId?: string | null;
  requestState: RequestState;
  window: DateWindow;
}): Promise<Array<{ window: DateWindow; rows: GoogleAdsRow[] }>> {
  const { customerId, queryBuilder, accessToken, developerToken, loginCustomerId, requestState, window } = params;
  const totalDays = getDaysBetween(window.startDate, window.endDate);

  if (totalDays > MAX_REPORT_WINDOW_DAYS) {
    const windows = splitDateRange(window.startDate, window.endDate, MAX_REPORT_WINDOW_DAYS);
    const allResults: Array<{ window: DateWindow; rows: GoogleAdsRow[] }> = [];

    for (const currentWindow of windows) {
      const partial = await runAdaptiveSearchStream({
        customerId,
        queryBuilder,
        accessToken,
        developerToken,
        loginCustomerId,
        requestState,
        window: currentWindow
      });
      allResults.push(...partial);
    }

    return allResults;
  }

  try {
    const query = queryBuilder(window);
    const rows = await googleAdsSearchStream({
      customerId,
      query,
      accessToken,
      developerToken,
      loginCustomerId,
      requestState
    });

    return [{ window, rows }];
  } catch (error) {
    const typedError = error as GoogleAdsApiError;

    if (typedError.tooMuchData && totalDays > 1) {
      const [leftWindow, rightWindow] = splitWindowInHalf(window);
      const left = await runAdaptiveSearchStream({
        customerId,
        queryBuilder,
        accessToken,
        developerToken,
        loginCustomerId,
        requestState,
        window: leftWindow
      });
      const right = await runAdaptiveSearchStream({
        customerId,
        queryBuilder,
        accessToken,
        developerToken,
        loginCustomerId,
        requestState,
        window: rightWindow
      });

      return [...left, ...right];
    }

    throw error;
  }
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
      ignoreDuplicates: false
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

  const results = new Map<string, CampaignDbRow>();

  for (const chunk of chunkArray(uniqueStrings(externalIds), SELECT_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, external_id, ad_account_id")
      .eq("ad_account_id", adAccountId)
      .in("external_id", chunk);

    if (error) {
      throw new Error(`Erro ao buscar campaigns sincronizadas: ${error.message}`);
    }

    for (const row of (data ?? []) as CampaignDbRow[]) {
      results.set(row.external_id, row);
    }
  }

  return [...results.values()];
}

async function loadAdSetRowsInChunks(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  campaignIds: string[],
  externalIds: string[]
): Promise<AdSetDbRow[]> {
  if (!supabase || campaignIds.length === 0 || externalIds.length === 0) return [];

  const results = new Map<string, AdSetDbRow>();

  for (const campaignChunk of chunkArray(uniqueStrings(campaignIds), SELECT_RELATION_CHUNK_SIZE)) {
    for (const externalChunk of chunkArray(uniqueStrings(externalIds), SELECT_CHUNK_SIZE)) {
      const { data, error } = await supabase
        .from("ad_sets")
        .select("id, external_id, campaign_id")
        .in("campaign_id", campaignChunk)
        .in("external_id", externalChunk);

      if (error) {
        throw new Error(
          `Erro ao buscar ad_sets sincronizados: ${error.message} | campaignChunk=${campaignChunk.length} | externalChunk=${externalChunk.length}`
        );
      }

      for (const row of (data ?? []) as AdSetDbRow[]) {
        results.set(`${row.campaign_id}:${row.external_id}`, row);
      }
    }
  }

  return [...results.values()];
}

async function loadAdRowsInChunks(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  adSetIds: string[],
  externalIds: string[]
): Promise<AdDbRow[]> {
  if (!supabase || adSetIds.length === 0 || externalIds.length === 0) return [];

  const results = new Map<string, AdDbRow>();

  for (const adSetChunk of chunkArray(uniqueStrings(adSetIds), SELECT_RELATION_CHUNK_SIZE)) {
    for (const externalChunk of chunkArray(uniqueStrings(externalIds), SELECT_CHUNK_SIZE)) {
      const { data, error } = await supabase
        .from("ads")
        .select("id, external_id, ad_set_id")
        .in("ad_set_id", adSetChunk)
        .in("external_id", externalChunk);

      if (error) {
        throw new Error(
          `Erro ao buscar ads sincronizados: ${error.message} | adSetChunk=${adSetChunk.length} | externalChunk=${externalChunk.length}`
        );
      }

      for (const row of (data ?? []) as AdDbRow[]) {
        results.set(`${row.ad_set_id}:${row.external_id}`, row);
      }
    }
  }

  return [...results.values()];
}

async function createSyncRun(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  account: GoogleAccountRow,
  syncPlan: SyncPlan
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
        mode: syncPlan.mode,
        startDate: syncPlan.startDate,
        endDate: syncPlan.endDate,
        dbClientMode: getSupabaseConfigDiagnostics().clientMode
      }
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
      metadata: payload.metadata ?? {}
    })
    .eq("id", syncRunId);

  if (error) {
    throw new Error(`Erro ao atualizar sync_run: ${error.message}`);
  }
}

async function findRecentRunningSync(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  account: GoogleAccountRow
) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("sync_runs")
    .select("id, started_at, metadata")
    .eq("workspace_id", account.workspace_id)
    .eq("platform", PLATFORM)
    .eq("status", "running")
    .order("started_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`Erro ao verificar sync_runs em execução: ${error.message}`);
  }

  const now = Date.now();
  return (data ?? []).find((row: any) => {
    const sameAccount = row?.metadata?.accountDbId === account.id;
    if (!sameAccount || !row.started_at) return false;
    const ageMs = now - new Date(String(row.started_at)).getTime();
    return ageMs <= RUNNING_SYNC_WINDOW_MINUTES * 60_000;
  }) ?? null;
}

async function markStaleRunningSyncs(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  account: GoogleAccountRow
) {
  if (!supabase) return;

  const { data, error } = await supabase
    .from("sync_runs")
    .select("id, started_at, metadata")
    .eq("workspace_id", account.workspace_id)
    .eq("platform", PLATFORM)
    .eq("status", "running")
    .order("started_at", { ascending: true })
    .limit(20);

  if (error) {
    throw new Error(`Erro ao verificar sync_runs travadas: ${error.message}`);
  }

  const staleIds = (data ?? [])
    .filter((row: any) => row?.metadata?.accountDbId === account.id && row.started_at)
    .filter((row: any) => Date.now() - new Date(String(row.started_at)).getTime() > STALE_RUNNING_SYNC_HOURS * 3_600_000)
    .map((row: any) => String(row.id));

  if (!staleIds.length) return;

  const { error: updateError } = await supabase
    .from("sync_runs")
    .update({
      status: "warning",
      finished_at: new Date().toISOString(),
      error_message: "Sync anterior marcada como travada e encerrada automaticamente.",
      metadata: {
        accountDbId: account.id,
        accountExternalId: account.external_id,
        autoClosedStaleRun: true
      }
    })
    .in("id", staleIds);

  if (updateError) {
    throw new Error(`Erro ao encerrar sync_runs travadas: ${updateError.message}`);
  }
}

async function hasCampaignStructure(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  adAccountId: string
) {
  if (!supabase) return false;

  const { count, error } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("ad_account_id", adAccountId);

  if (error) {
    throw new Error(`Erro ao verificar estrutura existente de campaigns: ${error.message}`);
  }

  return Boolean(count && count > 0);
}

async function loadExistingDailyMetricsSnapshot(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  account: GoogleAccountRow;
  window: DateWindow;
}) {
  const { supabase, account, window } = params;

  if (!supabase) return [];

  const { data, error } = await supabase
    .from("daily_metrics")
    .select(
      "workspace_id, ad_account_id, campaign_id, ad_set_id, ad_id, platform, metric_date, impressions, reach, clicks, link_clicks, landing_page_views, messages_started, engagements, leads, checkouts, purchases, results, result_label, spend, revenue, video_views_25, video_views_50, video_views_75, video_views_100, ctr, cpm, cpc, cost_per_result"
    )
    .eq("workspace_id", account.workspace_id)
    .eq("ad_account_id", account.id)
    .eq("platform", PLATFORM)
    .gte("metric_date", window.startDate)
    .lte("metric_date", window.endDate);

  if (error) {
    throw new Error(`Erro ao ler snapshot de daily_metrics: ${error.message}`);
  }

  return (data ?? []) as Record<string, unknown>[];
}

async function replaceDailyMetricsWindow(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  account: GoogleAccountRow;
  window: DateWindow;
  rows: Record<string, unknown>[];
}) {
  const { supabase, account, window, rows } = params;

  if (!supabase) return;

  const snapshot = await loadExistingDailyMetricsSnapshot({ supabase, account, window });

  const { error: deleteError } = await supabase
    .from("daily_metrics")
    .delete()
    .eq("workspace_id", account.workspace_id)
    .eq("ad_account_id", account.id)
    .eq("platform", PLATFORM)
    .gte("metric_date", window.startDate)
    .lte("metric_date", window.endDate);

  if (deleteError) {
    throw new Error(`Erro ao limpar daily_metrics do intervalo: ${deleteError.message}`);
  }

  try {
    if (rows.length > 0) {
      await insertInChunks(supabase, "daily_metrics", rows);
    }
  } catch (error) {
    if (snapshot.length > 0) {
      await insertInChunks(supabase, "daily_metrics", snapshot);
    }

    throw error;
  }
}

function buildMetricsQuery(window: DateWindow) {
  return `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.ctr,
      metrics.average_cpc,
      metrics.average_cpm,
      metrics.conversions,
      metrics.conversions_value,
      metrics.interactions,
      segments.date
    FROM campaign
    WHERE ${buildDateCondition(window)}
      AND campaign.status != 'REMOVED'
  `;
}

function buildStructureQuery(adGroupExternalIds?: string[]) {
  const adGroupFilter = adGroupExternalIds?.length
    ? `\n      AND ad_group.id IN (${adGroupExternalIds.map((id) => Number(id)).join(", ")})`
    : "";

  return `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      ad_group.id,
      ad_group.name,
      ad_group.status
    FROM ad_group
    WHERE campaign.status != 'REMOVED'
      AND ad_group.status != 'REMOVED'${adGroupFilter}
  `;
}

function buildAdsQuery(adGroupExternalIds: string[]) {
  return `
    SELECT
      ad_group.id,
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      ad_group_ad.ad.type,
      ad_group_ad.ad.final_urls,
      ad_group_ad.status
    FROM ad_group_ad
    WHERE ad_group.status != 'REMOVED'
      AND ad_group_ad.status != 'REMOVED'
      AND ad_group.id IN (${adGroupExternalIds.map((id) => Number(id)).join(", ")})
  `;
}

function upsertCampaignSeed(
  target: Map<string, { externalId: string; name: string; objective: string | null; status: string | null; isActive: boolean }>,
  row: GoogleAdsRow
) {
  if (!row.campaign?.id) return;

  const externalId = String(row.campaign.id);
  const previous = target.get(externalId);

  target.set(externalId, {
    externalId,
    name: row.campaign.name?.trim() || previous?.name || `Campaign ${externalId}`,
    objective: row.campaign.advertisingChannelType ?? previous?.objective ?? null,
    status: row.campaign.status ?? previous?.status ?? null,
    isActive: row.campaign.status === "ENABLED"
  });
}

function upsertAdSetSeed(
  target: Map<string, { campaignExternalId: string; externalId: string; name: string; status: string | null }>,
  row: GoogleAdsRow
) {
  if (!row.campaign?.id || !row.adGroup?.id) return;

  const campaignExternalId = String(row.campaign.id);
  const externalId = String(row.adGroup.id);
  const key = `${campaignExternalId}:${externalId}`;
  const previous = target.get(key);

  target.set(key, {
    campaignExternalId,
    externalId,
    name: row.adGroup.name?.trim() || previous?.name || `Ad group ${externalId}`,
    status: row.adGroup.status ?? previous?.status ?? null
  });
}

function buildCampaignPayload(
  account: GoogleAccountRow,
  campaignSeedMap: Map<string, { externalId: string; name: string; objective: string | null; status: string | null; isActive: boolean }>
) {
  return [...campaignSeedMap.values()].map((item) => ({
    workspace_id: account.workspace_id,
    ad_account_id: account.id,
    platform: PLATFORM,
    external_id: item.externalId,
    name: item.name,
    objective: item.objective,
    status: item.status,
    starts_at: null,
    ends_at: null,
    is_active: item.isActive
  }));
}

function buildAdSetPayload(
  adSetSeedMap: Map<string, { campaignExternalId: string; externalId: string; name: string; status: string | null }>,
  campaignMap: Map<string, string>
) {
  const rows: Record<string, unknown>[] = [];

  for (const item of adSetSeedMap.values()) {
    const campaignId = campaignMap.get(item.campaignExternalId);
    if (!campaignId) continue;

    rows.push({
      campaign_id: campaignId,
      external_id: item.externalId,
      name: item.name,
      status: item.status,
      starts_at: null,
      ends_at: null
    });
  }

  return rows;
}

function buildDailyMetricsPayload(params: {
  account: GoogleAccountRow;
  rows: GoogleAdsRow[];
  campaignMap: Map<string, string>;
  adSetMap: Map<string, string>;
}) {
  const { account, rows, campaignMap } = params;
  const aggregates = new Map<
    string,
    {
      metricDate: string;
      campaignId: string | null;
      impressions: number;
      clicks: number;
      spend: number;
      conversions: number;
      conversionsValue: number;
      interactions: number;
    }
  >();

  for (const row of rows) {
    const metricDate = row.segments?.date?.trim();
    if (!metricDate) continue;

    const campaignExternalId = row.campaign?.id ? String(row.campaign.id) : "";
    const campaignId = campaignExternalId ? campaignMap.get(campaignExternalId) ?? null : null;

    const key = [metricDate, campaignId ?? ""].join("|");
    const current = aggregates.get(key) ?? {
      metricDate,
      campaignId,
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      conversionsValue: 0,
      interactions: 0
    };

    current.impressions += toInteger(row.metrics?.impressions);
    current.clicks += toInteger(row.metrics?.clicks);
    current.spend += toMoneyFromMicros(row.metrics?.costMicros);
    current.conversions += toNumber(row.metrics?.conversions);
    current.conversionsValue += toNumber(row.metrics?.conversionsValue);
    current.interactions += toInteger(row.metrics?.interactions);
    aggregates.set(key, current);
  }

  return [...aggregates.values()].map((item) => {
    const results = item.conversions;
    const ctr = item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0;
    const cpc = item.clicks > 0 ? item.spend / item.clicks : 0;
    const cpm = item.impressions > 0 ? (item.spend / item.impressions) * 1000 : 0;
    const costPerResult = results > 0 ? item.spend / results : 0;

    return {
      workspace_id: account.workspace_id,
      ad_account_id: account.id,
      campaign_id: item.campaignId,
      ad_set_id: null,
      ad_id: null,
      platform: PLATFORM,
      metric_date: item.metricDate,
      impressions: item.impressions,
      reach: 0,
      clicks: item.clicks,
      link_clicks: item.clicks,
      landing_page_views: 0,
      messages_started: 0,
      engagements: item.interactions,
      leads: Math.round(results),
      checkouts: 0,
      purchases: 0,
      results: Math.round(results),
      result_label: "Conversões",
      spend: Number(item.spend.toFixed(2)),
      revenue: Number(item.conversionsValue.toFixed(2)),
      video_views_25: 0,
      video_views_50: 0,
      video_views_75: 0,
      video_views_100: 0,
      ctr: Number(ctr.toFixed(4)),
      cpm: Number(cpm.toFixed(4)),
      cpc: Number(cpc.toFixed(4)),
      cost_per_result: Number(costPerResult.toFixed(4))
    };
  });
}

async function syncAdsBestEffort(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  account: GoogleAccountRow;
  customerId: string;
  accessToken: string;
  developerToken: string;
  loginCustomerId?: string | null;
  adSetMap: Map<string, string>;
  requestState: RequestState;
}) {
  const {
    supabase,
    customerId,
    accessToken,
    developerToken,
    loginCustomerId,
    adSetMap,
    requestState
  } = params;

  if (!supabase || adSetMap.size === 0) {
    return { synced: 0, warning: null as string | null };
  }

  const adSetExternalIds = [...new Set([...adSetMap.keys()].map((key) => key.split(":")[1]).filter(Boolean))];
  const adSetByExternalId = new Map<string, string>();
  for (const [key, adSetId] of adSetMap.entries()) {
    const adGroupExternalId = key.split(":")[1];
    if (adGroupExternalId) {
      adSetByExternalId.set(adGroupExternalId, adSetId);
    }
  }
  const adPayload: Record<string, unknown>[] = [];

  try {
    for (const adGroupChunk of chunkArray(adSetExternalIds, 100)) {
      const rows = await googleAdsSearchStream({
        customerId,
        query: buildAdsQuery(adGroupChunk),
        accessToken,
        developerToken,
        loginCustomerId,
        requestState
      });

      for (const row of rows) {
        if (!row.adGroup?.id || !row.adGroupAd?.ad?.id) continue;

        const adSetId = adSetByExternalId.get(String(row.adGroup.id)) ?? null;

        if (!adSetId) continue;

        adPayload.push({
          ad_set_id: adSetId,
          external_id: String(row.adGroupAd.ad.id),
          name: row.adGroupAd.ad.name?.trim() || `Ad ${row.adGroupAd.ad.id}`,
          creative_name: row.adGroupAd.ad.type ?? null,
          status: row.adGroupAd.status ?? null,
          preview_url: Array.isArray(row.adGroupAd.ad.finalUrls)
            ? row.adGroupAd.ad.finalUrls[0] ?? null
            : null,
          thumbnail_url: null
        });
      }
    }

    const deduped = new Map<string, Record<string, unknown>>();
    for (const row of adPayload) {
      const key = `${String(row.ad_set_id)}:${String(row.external_id)}`;
      deduped.set(key, row);
    }

    await upsertInChunks(supabase, "ads", [...deduped.values()], "ad_set_id,external_id");
    return { synced: deduped.size, warning: null as string | null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha não-bloqueante ao sincronizar ads.";
    return { synced: 0, warning: message };
  }
}

async function syncSingleGoogleAccount(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  account: GoogleAccountRow;
  accessToken: string;
  developerToken: string;
  loginCustomerId?: string | null;
  syncPlan: SyncPlan;
}): Promise<SyncAccountResult> {
  const { supabase, account, accessToken, developerToken, loginCustomerId, syncPlan } = params;

  if (!supabase) {
    throw new Error("Supabase não configurado para sincronização.");
  }

  const warnings: string[] = [];
  const requestState: RequestState = {
    requestCount: 0,
    retries: 0,
    queryResourceConsumption: 0
  };

  const normalizedExternalId = normalizeGoogleCustomerId(account.external_id);
  let syncRunId: string | null = null;

  try {
    await markStaleRunningSyncs(supabase, account);

    const runningSync = await findRecentRunningSync(supabase, account);
    if (runningSync) {
      return {
        ok: true,
        skipped: true,
        accountDbId: account.id,
        accountNameInDb: account.name,
        externalId: account.external_id,
        normalizedExternalId,
        syncRunId: runningSync.id,
        dateRange: {
          startDate: syncPlan.startDate,
          endDate: syncPlan.endDate
        },
        mode: syncPlan.mode,
        warnings: ["Já existe uma sincronização recente em execução para esta conta Google."],
        campaignsSynced: 0,
        adSetsSynced: 0,
        adsSynced: 0,
        dailyMetricsInserted: 0,
        windowCount: 0,
        requestCount: 0,
        retries: 0,
        dbClientMode: getSupabaseConfigDiagnostics().clientMode
      };
    }

    syncRunId = await createSyncRun(supabase, account, syncPlan);

    const metricReports = await runAdaptiveSearchStream({
      customerId: normalizedExternalId,
      queryBuilder: buildMetricsQuery,
      accessToken,
      developerToken,
      loginCustomerId,
      requestState,
      window: {
        startDate: syncPlan.startDate,
        endDate: syncPlan.endDate
      }
    });

    const campaignSeedMap = new Map<
      string,
      { externalId: string; name: string; objective: string | null; status: string | null; isActive: boolean }
    >();
    const adSetSeedMap = new Map<
      string,
      { campaignExternalId: string; externalId: string; name: string; status: string | null }
    >();

    for (const report of metricReports) {
      for (const row of report.rows) {
        upsertCampaignSeed(campaignSeedMap, row);
        upsertAdSetSeed(adSetSeedMap, row);
      }
    }

    const shouldRefreshStructure =
      syncPlan.forceStructureRefresh ||
      campaignSeedMap.size === 0 ||
      !(await hasCampaignStructure(supabase, account.id));

    if (shouldRefreshStructure) {
      const structureRows = await googleAdsSearchStream({
        customerId: normalizedExternalId,
        query: buildStructureQuery(),
        accessToken,
        developerToken,
        loginCustomerId,
        requestState
      });

      for (const row of structureRows) {
        upsertCampaignSeed(campaignSeedMap, row);
        upsertAdSetSeed(adSetSeedMap, row);
      }
    }

    const campaignPayload = buildCampaignPayload(account, campaignSeedMap);
    await upsertInChunks(supabase, "campaigns", campaignPayload, "ad_account_id,external_id");

    const campaignRows = await loadCampaignRowsInChunks(
      supabase,
      account.id,
      campaignPayload.map((row) => String(row.external_id))
    );
    const campaignMap = new Map<string, string>();
    for (const row of campaignRows) {
      campaignMap.set(row.external_id, row.id);
    }

    const adSetPayload = buildAdSetPayload(adSetSeedMap, campaignMap);
    await upsertInChunks(supabase, "ad_sets", adSetPayload, "campaign_id,external_id");

    const adSetRows = await loadAdSetRowsInChunks(
      supabase,
      [...campaignMap.values()],
      adSetPayload.map((row) => String(row.external_id))
    );
    const adSetMap = new Map<string, string>();
    for (const [key, value] of adSetSeedMap.entries()) {
      const found = adSetRows.find(
        (row) => row.external_id === value.externalId && row.campaign_id === campaignMap.get(value.campaignExternalId)
      );
      if (found) {
        adSetMap.set(key, found.id);
      }
    }

    let totalInsertedDailyMetrics = 0;
    for (const report of metricReports) {
      const payload = buildDailyMetricsPayload({
        account,
        rows: report.rows,
        campaignMap,
        adSetMap
      });

      await replaceDailyMetricsWindow({
        supabase,
        account,
        window: report.window,
        rows: payload
      });

      totalInsertedDailyMetrics += payload.length;
    }

    let adsSynced = 0;
    if (syncPlan.syncAds && syncPlan.mode === "backfill") {
      const adsResult = await syncAdsBestEffort({
        supabase,
        account,
        customerId: normalizedExternalId,
        accessToken,
        developerToken,
        loginCustomerId,
        adSetMap,
        requestState
      });
      adsSynced = adsResult.synced;
      if (adsResult.warning) {
        warnings.push(`Falha não-bloqueante ao sincronizar estrutura de ads: ${adsResult.warning}`);
      }
    } else {
      warnings.push(
        syncPlan.mode === "realtime"
          ? "Sync de ads foi desativada nesta execução em modo realtime para priorizar atualização rápida das métricas do Google."
          : "Sync de ads não foi solicitada para este backfill do Google. Use syncAds=1 se quiser materializar ads."
      );
    }

    if (!isSupabaseUsingServiceRole()) {
      warnings.push(
        "A sincronização está usando chave pública do Supabase no servidor. Para maior estabilidade e permissões completas, configure SUPABASE_SERVICE_ROLE_KEY."
      );
    }

    const insertedRows = campaignPayload.length + adSetPayload.length + adsSynced + totalInsertedDailyMetrics;
    const status = warnings.length ? "warning" : "ok";

    await finalizeSyncRun(supabase, syncRunId, {
      status,
      inserted_rows: insertedRows,
      error_message: warnings.length ? warnings.join(" | ") : null,
      metadata: {
        source: syncPlan.mode === "realtime" ? "google_realtime_campaign_daily_v2" : "google_backfill_campaign_daily_v2",
        accountDbId: account.id,
        accountExternalId: normalizedExternalId,
        accountName: account.name,
        mode: syncPlan.mode,
        startDate: syncPlan.startDate,
        endDate: syncPlan.endDate,
        requestCount: requestState.requestCount,
        retries: requestState.retries,
        queryResourceConsumption: requestState.queryResourceConsumption,
        dbClientMode: getSupabaseConfigDiagnostics().clientMode,
        counts: {
          campaigns: campaignPayload.length,
          adSets: adSetPayload.length,
          ads: adsSynced,
          dailyMetrics: totalInsertedDailyMetrics,
          windows: metricReports.length
        },
        warnings
      }
    });

    return {
      ok: true,
      accountDbId: account.id,
      accountNameInDb: account.name,
      externalId: account.external_id,
      normalizedExternalId,
      syncRunId,
      dateRange: {
        startDate: syncPlan.startDate,
        endDate: syncPlan.endDate
      },
      mode: syncPlan.mode,
      warnings,
      campaignsSynced: campaignPayload.length,
      adSetsSynced: adSetPayload.length,
      adsSynced,
      dailyMetricsInserted: totalInsertedDailyMetrics,
      windowCount: metricReports.length,
      requestCount: requestState.requestCount,
      retries: requestState.retries,
      dbClientMode: getSupabaseConfigDiagnostics().clientMode
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao sincronizar conta Google.";

    await finalizeSyncRun(supabase, syncRunId, {
      status: "error",
      inserted_rows: 0,
      error_message: message,
      metadata: {
        source: syncPlan.mode === "realtime" ? "google_realtime_campaign_daily_v2" : "google_backfill_campaign_daily_v2",
        accountDbId: account.id,
        accountExternalId: normalizedExternalId,
        accountName: account.name,
        mode: syncPlan.mode,
        startDate: syncPlan.startDate,
        endDate: syncPlan.endDate,
        requestCount: requestState.requestCount,
        retries: requestState.retries,
        queryResourceConsumption: requestState.queryResourceConsumption,
        dbClientMode: getSupabaseConfigDiagnostics().clientMode,
        warnings
      }
    });

    return {
      ok: false,
      accountDbId: account.id,
      accountNameInDb: account.name,
      externalId: account.external_id,
      normalizedExternalId,
      syncRunId,
      dateRange: {
        startDate: syncPlan.startDate,
        endDate: syncPlan.endDate
      },
      mode: syncPlan.mode,
      warnings,
      campaignsSynced: 0,
      adSetsSynced: 0,
      adsSynced: 0,
      dailyMetricsInserted: 0,
      windowCount: 0,
      requestCount: requestState.requestCount,
      retries: requestState.retries,
      dbClientMode: getSupabaseConfigDiagnostics().clientMode,
      error: message
    };
  }
}

function getIncomingSyncSecret(request: Request) {
  const syncSecret = request.headers.get("x-sync-secret")?.trim();
  if (syncSecret) return syncSecret;

  const authorization = request.headers.get("authorization")?.trim() || "";
  const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
  return bearerMatch?.[1]?.trim() ?? "";
}

function getAcceptedSyncSecrets() {
  return uniqueStrings([readEnv("INTERNAL_SYNC_SECRET"), readEnv("CRON_SECRET")]);
}

function ensureSyncAuthorization(request: Request) {
  const acceptedSecrets = getAcceptedSyncSecrets();

  if (acceptedSecrets.length === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "INTERNAL_SYNC_SECRET ou CRON_SECRET não configurada. Em produção, configure pelo menos uma chave para proteger as rotas de sync."
      );
    }
    return;
  }

  const incomingSecret = getIncomingSyncSecret(request);
  if (!incomingSecret || !acceptedSecrets.includes(incomingSecret)) {
    throw new Error("Não autorizado.");
  }
}

function getMissingGoogleSyncEnv() {
  const requiredEnv = [
    "GOOGLE_ADS_DEVELOPER_TOKEN",
    "GOOGLE_ADS_CLIENT_ID",
    "GOOGLE_ADS_CLIENT_SECRET",
    "GOOGLE_ADS_REFRESH_TOKEN"
  ];

  return requiredEnv.filter((name) => !readEnv(name));
}

async function handleSync(request: Request, options: { skipAuth?: boolean } = {}) {
  if (!options.skipAuth) {
    ensureSyncAuthorization(request);
  }

  const missingGoogleEnv = getMissingGoogleSyncEnv();
  if (missingGoogleEnv.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `Credenciais do Google Ads não configuradas: ${missingGoogleEnv.join(", ")}.`,
        diagnostics: getSupabaseConfigDiagnostics()
      },
      { status: 500 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase não configurado para sincronização.",
        diagnostics: getSupabaseConfigDiagnostics()
      },
      { status: 500 }
    );
  }

  const developerToken = readEnv("GOOGLE_ADS_DEVELOPER_TOKEN");
  const loginCustomerId = readEnv("GOOGLE_ADS_LOGIN_CUSTOMER_ID").replace(/\D/g, "") || null;
  const accessToken = await getGoogleAccessToken();
  const syncPlan = getSyncPlan(request);
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
    ascending: true
  });

  if (accountsError) {
    return NextResponse.json(
      { ok: false, error: `Erro ao buscar ad_accounts: ${accountsError.message}` },
      { status: 500 }
    );
  }

  const googleAccounts = (accounts ?? []) as GoogleAccountRow[];
  if (googleAccounts.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Nenhuma conta Google ativa encontrada para sincronização." },
      { status: 404 }
    );
  }

  const results: SyncAccountResult[] = [];
  for (const account of googleAccounts) {
    const result = await syncSingleGoogleAccount({
      supabase,
      account,
      accessToken,
      developerToken,
      loginCustomerId,
      syncPlan
    });
    results.push(result);
  }

  const successCount = results.filter((item) => item.ok && !item.skipped).length;
  const skippedCount = results.filter((item) => item.skipped).length;
  const failureCount = results.filter((item) => !item.ok).length;

  return NextResponse.json({
    ok: failureCount === 0,
    platform: PLATFORM,
    mode: syncPlan.mode,
    startDate: syncPlan.startDate,
    endDate: syncPlan.endDate,
    syncedAccounts: successCount,
    skippedAccounts: skippedCount,
    failedAccounts: failureCount,
    diagnostics: {
      supabase: getSupabaseConfigDiagnostics(),
      usingServiceRole: isSupabaseUsingServiceRole()
    },
    results
  });
}

export async function runGoogleSyncRequest(
  request: Request,
  options: { skipAuth?: boolean } = {}
) {
  try {
    return await handleSync(request, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido na sincronização Google.";

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
