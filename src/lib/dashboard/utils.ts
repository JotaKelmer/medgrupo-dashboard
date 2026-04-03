export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2
  }).format(value || 0);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value || 0);
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value || 0);
}

export function formatPercent(value: number, digits = 2) {
  return `${(value || 0).toFixed(digits).replace(".", ",")}%`;
}


export function formatDecimal(value: number, digits = 2) {
  return (value || 0).toFixed(digits).replace(".", ",");
}

export function formatMultiplier(value: number, digits = 2) {
  return `${formatDecimal(value, digits)}x`;
}

export function toISODate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startDateFromDaysBack(days: number) {
  const today = new Date();
  const start = addDays(today, -(days - 1));
  return toISODate(start);
}

export function safeDivide(value: number, total: number) {
  if (!total) return 0;
  return value / total;
}

export function percentageChange(current: number, previous: number) {
  if (!previous && !current) return 0;
  if (!previous) return 100;
  return ((current - previous) / previous) * 100;
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
