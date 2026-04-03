import type { Ga4DateRange } from '@/types/ga4-dashboard';

type MaybeDate = string | Date | null | undefined;

type RangeInput =
  | Partial<Ga4DateRange>
  | {
      from?: MaybeDate;
      to?: MaybeDate;
      startDate?: MaybeDate;
      endDate?: MaybeDate;
    }
  | null
  | undefined;

const DEFAULT_HISTORY_CYCLES = 6;
const MAX_HISTORY_CYCLES = 12;

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function formatLocalDateToIso(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function normalizeDateInput(value: MaybeDate): string | null {
  if (value == null) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return formatLocalDateToIso(value);
  }

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const lowered = trimmed.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const isoWithTimeMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:T|\s)/);
  if (isoWithTimeMatch?.[1]) {
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
  if (Number.isNaN(parsedDate.getTime())) return null;

  return formatLocalDateToIso(parsedDate);
}

function getRangeStart(range: RangeInput) {
  if (!range) return null;

  return normalizeDateInput(
    (range as { startDate?: MaybeDate }).startDate ??
      (range as { from?: MaybeDate }).from ??
      (range as { endDate?: MaybeDate }).endDate ??
      (range as { to?: MaybeDate }).to,
  );
}

function getRangeEnd(range: RangeInput) {
  if (!range) return null;

  return normalizeDateInput(
    (range as { endDate?: MaybeDate }).endDate ??
      (range as { to?: MaybeDate }).to ??
      (range as { startDate?: MaybeDate }).startDate ??
      (range as { from?: MaybeDate }).from,
  );
}

function setRangeParams(
  params: URLSearchParams,
  range: RangeInput,
  startKey: string,
  endKey: string,
) {
  const startDate = getRangeStart(range);
  const endDate = getRangeEnd(range);

  if (startDate) {
    params.set(startKey, startDate);
  }

  if (endDate) {
    params.set(endKey, endDate);
  }
}

export function buildGa4AnalyticsUrl(input: {
  currentRange?: RangeInput;
  previousRange?: RangeInput;
  historyCycles?: number;
}) {
  const params = new URLSearchParams();

  setRangeParams(params, input.currentRange, 'startDate', 'endDate');
  setRangeParams(
    params,
    input.previousRange,
    'compareStartDate',
    'compareEndDate',
  );

  const safeHistoryCycles = Number.isInteger(input.historyCycles)
    ? Math.min(Math.max(Number(input.historyCycles), 1), MAX_HISTORY_CYCLES)
    : DEFAULT_HISTORY_CYCLES;

  params.set('historyCycles', String(safeHistoryCycles));

  return `/api/analytics/ga4?${params.toString()}`;
}

export async function fetchGa4Dashboard(input: {
  currentRange?: RangeInput;
  previousRange?: RangeInput;
  historyCycles?: number;
}) {
  const response = await fetch(buildGa4AnalyticsUrl(input), {
    method: 'GET',
    cache: 'no-store',
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error ?? '[GA4] Falha ao carregar o dashboard.');
  }

  return payload;
}