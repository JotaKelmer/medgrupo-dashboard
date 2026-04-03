import { NextRequest, NextResponse } from 'next/server';

import { batchRunGa4Reports } from '@/lib/analytics/ga4-client';
import { getGa4RuntimeConfig } from '@/lib/analytics/ga4-config';
import { buildGa4DashboardPayload } from '@/lib/analytics/ga4-mappers';
import type { Ga4DateRange } from '@/types/ga4-dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

class BadRequestError extends Error {}

const DEFAULT_HISTORY_CYCLES = 6;
const MAX_HISTORY_CYCLES = 12;

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toIsoDate(date: Date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(
    date.getUTCDate(),
  )}`;
}

function normalizeDateString(raw: string, label: string): string {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new BadRequestError(
      `[GA4] O parâmetro ${label} precisa estar no formato YYYY-MM-DD.`,
    );
  }

  const lowered = trimmed.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') {
    throw new BadRequestError(
      `[GA4] O parâmetro ${label} precisa estar no formato YYYY-MM-DD.`,
    );
  }

  if (isIsoDate(trimmed)) {
    return trimmed;
  }

  const isoWithTimeMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:T|\s)/);
  if (isoWithTimeMatch?.[1] && isIsoDate(isoWithTimeMatch[1])) {
    return isoWithTimeMatch[1];
  }

  const brDateMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDateMatch) {
    const [, day, month, year] = brDateMatch;
    return `${year}-${month}-${day}`;
  }

  const slashIsoMatch = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (slashIsoMatch) {
    const [, year, month, day] = slashIsoMatch;
    return `${year}-${month}-${day}`;
  }

  const parsedDate = new Date(trimmed);
  if (!Number.isNaN(parsedDate.getTime())) {
    return toIsoDate(parsedDate);
  }

  throw new BadRequestError(
    `[GA4] O parâmetro ${label} precisa estar no formato YYYY-MM-DD.`,
  );
}

function parseIsoDate(value: string, label: string) {
  const normalized = normalizeDateString(value, label);

  if (!isIsoDate(normalized)) {
    throw new BadRequestError(
      `[GA4] O parâmetro ${label} precisa estar no formato YYYY-MM-DD.`,
    );
  }

  const parsedDate = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new BadRequestError(`[GA4] O parâmetro ${label} é inválido.`);
  }

  return parsedDate;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getTodayUtc() {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function getDefaultCurrentRange(): Ga4DateRange {
  const today = getTodayUtc();
  const yesterday = addDays(today, -1);

  return {
    startDate: toIsoDate(yesterday),
    endDate: toIsoDate(today),
  };
}

function getInclusiveDaySpan(range: Ga4DateRange) {
  const start = parseIsoDate(range.startDate, 'startDate').getTime();
  const end = parseIsoDate(range.endDate, 'endDate').getTime();
  const diffMs = end - start;

  return Math.floor(diffMs / 86_400_000) + 1;
}

function validateRange(range: Ga4DateRange, label: string): Ga4DateRange {
  const normalizedRange = {
    startDate: normalizeDateString(range.startDate, `${label}.startDate`),
    endDate: normalizeDateString(range.endDate, `${label}.endDate`),
  };

  const start = parseIsoDate(
    normalizedRange.startDate,
    `${label}.startDate`,
  );
  const end = parseIsoDate(normalizedRange.endDate, `${label}.endDate`);

  if (start.getTime() > end.getTime()) {
    throw new BadRequestError(
      `[GA4] ${label}.startDate não pode ser maior que ${label}.endDate.`,
    );
  }

  return normalizedRange;
}

function getOptionalDateParam(
  searchParams: URLSearchParams,
  key: string,
  label: string,
): string | null {
  const raw = searchParams.get(key);

  if (raw == null) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const lowered = trimmed.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') {
    return null;
  }

  return normalizeDateString(trimmed, label);
}

function resolveCurrentRange(searchParams: URLSearchParams): Ga4DateRange {
  const startDate = getOptionalDateParam(
    searchParams,
    'startDate',
    'currentRange.startDate',
  );
  const endDate = getOptionalDateParam(
    searchParams,
    'endDate',
    'currentRange.endDate',
  );

  if (!startDate || !endDate) {
    return getDefaultCurrentRange();
  }

  return validateRange({ startDate, endDate }, 'currentRange');
}

function resolvePreviousRange(
  currentRange: Ga4DateRange,
  searchParams: URLSearchParams,
): Ga4DateRange {
  const compareStartDate = getOptionalDateParam(
    searchParams,
    'compareStartDate',
    'previousRange.startDate',
  );
  const compareEndDate = getOptionalDateParam(
    searchParams,
    'compareEndDate',
    'previousRange.endDate',
  );

  if (!compareStartDate && !compareEndDate) {
    const currentStart = parseIsoDate(
      currentRange.startDate,
      'currentRange.startDate',
    );
    const daySpan = getInclusiveDaySpan(currentRange);

    const previousEnd = addDays(currentStart, -1);
    const previousStart = addDays(previousEnd, -(daySpan - 1));

    return {
      startDate: toIsoDate(previousStart),
      endDate: toIsoDate(previousEnd),
    };
  }

  if (!compareStartDate || !compareEndDate) {
    throw new BadRequestError(
      '[GA4] compareStartDate e compareEndDate precisam ser enviados juntos.',
    );
  }

  return validateRange(
    {
      startDate: compareStartDate,
      endDate: compareEndDate,
    },
    'previousRange',
  );
}

function resolveHistoryCycles(searchParams: URLSearchParams) {
  const raw = searchParams.get('historyCycles');

  if (raw == null) return DEFAULT_HISTORY_CYCLES;

  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_HISTORY_CYCLES;

  const lowered = trimmed.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') {
    return DEFAULT_HISTORY_CYCLES;
  }

  const parsed = Number(trimmed);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestError(
      '[GA4] historyCycles precisa ser um inteiro positivo.',
    );
  }

  return Math.min(parsed, MAX_HISTORY_CYCLES);
}

function buildHistoricalRanges(currentRange: Ga4DateRange, cycles: number) {
  const daySpan = getInclusiveDaySpan(currentRange);
  const currentStart = parseIsoDate(
    currentRange.startDate,
    'currentRange.startDate',
  );

  const ranges: Ga4DateRange[] = [];
  let windowEnd = addDays(currentStart, -1);

  for (let index = 0; index < cycles; index += 1) {
    const windowStart = addDays(windowEnd, -(daySpan - 1));

    ranges.push({
      startDate: toIsoDate(windowStart),
      endDate: toIsoDate(windowEnd),
    });

    windowEnd = addDays(windowStart, -1);
  }

  return ranges;
}

function summaryReportRequest(range: Ga4DateRange) {
  return {
    metrics: [
      { name: 'totalUsers' },
      { name: 'sessions' },
      { name: 'engagementRate' },
      { name: 'keyEvents' },
    ],
    dateRanges: [range],
  };
}

function sourceBreakdownRequest(range: Ga4DateRange) {
  return {
    dimensions: [{ name: 'sessionSourceMedium' }],
    metrics: [
      { name: 'totalUsers' },
      { name: 'sessions' },
      { name: 'keyEvents' },
    ],
    dateRanges: [range],
    orderBys: [
      {
        metric: {
          metricName: 'sessions',
        },
        desc: true,
      },
    ],
    limit: 250,
  };
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    result.push(items.slice(index, index + chunkSize));
  }

  return result;
}

async function runHistoricalSummaryReports(ranges: Ga4DateRange[]) {
  if (!ranges.length) return [];

  const chunks = chunkArray(ranges, 5);
  const responses = [];

  for (const chunk of chunks) {
    const chunkResponses = await batchRunGa4Reports(
      chunk.map((range) => summaryReportRequest(range)),
    );
    responses.push(...chunkResponses);
  }

  return responses;
}

export async function GET(request: NextRequest) {
  try {
    const currentRange = resolveCurrentRange(request.nextUrl.searchParams);
    const previousRange = resolvePreviousRange(
      currentRange,
      request.nextUrl.searchParams,
    );
    const historyCycles = resolveHistoryCycles(request.nextUrl.searchParams);
    const historicalRanges = buildHistoricalRanges(currentRange, historyCycles);

    const primaryReports = await batchRunGa4Reports([
      summaryReportRequest(currentRange),
      summaryReportRequest(previousRange),
      sourceBreakdownRequest(currentRange),
      sourceBreakdownRequest(previousRange),
    ]);

    if (primaryReports.length !== 4) {
      throw new Error(
        `[GA4] A API retornou ${primaryReports.length} relatórios, mas eram esperados 4.`,
      );
    }

    const historicalSummaryReports =
      await runHistoricalSummaryReports(historicalRanges);

    const payload = buildGa4DashboardPayload({
      propertyId: getGa4RuntimeConfig().propertyId,
      currentRange,
      previousRange,
      currentSummaryReport: primaryReports[0],
      previousSummaryReport: primaryReports[1],
      currentSourceReport: primaryReports[2],
      previousSourceReport: primaryReports[3],
      historicalSummaryReports,
    });

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '[GA4] Falha desconhecida';

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status: error instanceof BadRequestError ? 400 : 500,
      },
    );
  }
}