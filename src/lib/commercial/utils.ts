import { formatNumber, formatPercent } from "@/lib/dashboard/utils";

export { formatNumber, formatPercent };

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function differenceInCalendarDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diff / 86400000));
}

export function getPreviousPeriod(startDate: string, endDate: string) {
  const length = differenceInCalendarDays(startDate, endDate) + 1;
  const start = new Date(`${startDate}T12:00:00Z`);
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(length - 1));

  return {
    previousStartDate: toIsoDate(prevStart),
    previousEndDate: toIsoDate(prevEnd),
  };
}

export function getDefaultCommercialPeriod() {
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);

  const end = addDays(today, -1);
  const start = addDays(end, -27);

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  };
}

export function normalizeDateParam(value: string | string[] | undefined) {
  const resolved = Array.isArray(value) ? value[0] : value;

  if (!resolved) return undefined;
  const trimmed = resolved.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

export function normalizeOwnerParam(value: string | string[] | undefined) {
  const resolved = Array.isArray(value) ? value[0] : value;
  const normalized = resolved?.trim();

  if (!normalized) return "all";
  return normalized;
}

export function startOfWeekIso(dateString: string) {
  const date = new Date(`${dateString}T12:00:00Z`);
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return toIsoDate(date);
}

export function formatWeekLabel(dateString: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${dateString}T12:00:00Z`));
}

export function formatDateTime(dateString: string | null | undefined) {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function buildSuggestedFeedback(params: {
  ownerName: string;
  coveragePercent: number;
  stagnantPercent: number;
  activitiesDoneYesterday: number;
  activitiesOverdue: number;
  dealsAdvancedYesterday: number;
  dealsWonYesterday: number;
  dealsLostYesterday: number;
}) {
  const coverage = Math.round(params.coveragePercent * 100);
  const stagnation = Math.round(params.stagnantPercent * 100);

  if (params.dealsWonYesterday >= 2 && params.coveragePercent >= 0.75) {
    return `${params.ownerName} sustentou boa cobertura (${coverage}%) e converteu bem no período. Próximo passo: proteger o topo do funil e replicar o discurso que gerou os ganhos recentes.`;
  }

  if (params.activitiesOverdue >= 3 || params.stagnantPercent >= 0.35) {
    return `${params.ownerName} precisa reduzir estoque parado (${stagnation}% estagnado) e limpar atividades vencidas. Prioridade da semana: reativar leads quentes e agendar próximos passos para cada oportunidade aberta.`;
  }

  if (params.dealsAdvancedYesterday === 0 && params.activitiesDoneYesterday <= 2) {
    return `${params.ownerName} manteve baixa tração operacional. Foco imediato: aumentar cadência, registrar contatos no CRM e gerar avanço real de etapa nas oportunidades do período.`;
  }

  if (params.dealsLostYesterday > params.dealsWonYesterday) {
    return `${params.ownerName} perdeu mais negociações do que ganhou no recorte. Vale revisar objeções recorrentes, timing de follow-up e critério de qualificação antes de empurrar novas propostas.`;
  }

  return `${params.ownerName} está em faixa estável. Recomendação: reforçar rotina diária no CRM, manter cobertura acima de 70% e acelerar oportunidades que já tiveram interação recente.`;
}
