export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateToYmd(date: Date): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
}

export function isValidYmd(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function normalizeGa4DateInput(input: unknown): string | null {
  if (!input) return null;

  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return formatDateToYmd(input);
  }

  if (typeof input !== "string") return null;

  const value = input.trim();
  if (!value) return null;

  // já está correto
  if (isValidYmd(value)) {
    return value;
  }

  // ISO completo: 2026-04-02T00:00:00.000Z
  const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoMatch?.[1] && isValidYmd(isoMatch[1])) {
    return isoMatch[1];
  }

  // dd/MM/yyyy
  const brMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    const normalized = `${year}-${month}-${day}`;
    if (isValidYmd(normalized)) return normalized;
  }

  // yyyy/MM/dd
  const slashYmdMatch = value.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (slashYmdMatch) {
    const [, year, month, day] = slashYmdMatch;
    const normalized = `${year}-${month}-${day}`;
    if (isValidYmd(normalized)) return normalized;
  }

  // fallback seguro
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateToYmd(parsed);
  }

  return null;
}

export function normalizeGa4DateRange(input: {
  startDate?: unknown;
  endDate?: unknown;
}) {
  const startDate = normalizeGa4DateInput(input.startDate);
  const endDate = normalizeGa4DateInput(input.endDate);

  if (!startDate) {
    throw new Error('[GA4] O parâmetro currentRange.startDate precisa estar no formato YYYY-MM-DD.');
  }

  if (!endDate) {
    throw new Error('[GA4] O parâmetro currentRange.endDate precisa estar no formato YYYY-MM-DD.');
  }

  return { startDate, endDate };
}