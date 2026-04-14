"use client";

import { useMemo, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import type { CommercialAggregatedMetric } from "@/lib/commercial/types";
import { formatNumber } from "@/lib/commercial/utils";

type SummaryStats = {
  coverage: number;
  activities: number;
  activitiesTotal: number;
  activitiesOverdue: number;
  advances: number;
  won: number;
  lost: number;
  quality: number;
  totalDeals: number;
  conversion: number;
};

type SupportItem = {
  value: string;
  label: string;
  muted?: boolean;
};

function summarizeRows(rows: CommercialAggregatedMetric[]): SummaryStats {
  const won = rows.reduce((sum, row) => sum + row.dealsWonYesterday, 0);
  const lost = rows.reduce((sum, row) => sum + row.dealsLostYesterday, 0);
  const totalClosed = won + lost;

  return {
    coverage: rows.length
      ? rows.reduce((sum, row) => sum + row.coveragePercent, 0) / rows.length
      : 0,
    activities: rows.reduce((sum, row) => sum + row.activitiesDoneYesterday, 0),
    activitiesTotal: rows.reduce(
      (sum, row) => sum + row.activitiesTotalYesterday,
      0,
    ),
    activitiesOverdue: rows.reduce((sum, row) => sum + row.activitiesOverdue, 0),
    advances: rows.reduce((sum, row) => sum + row.dealsAdvancedYesterday, 0),
    won,
    lost,
    quality: rows.length
      ? rows.reduce((sum, row) => sum + (1 - row.stagnantPercent), 0) / rows.length
      : 0,
    totalDeals: rows.reduce((sum, row) => sum + row.totalOpenDeals, 0),
    conversion: totalClosed > 0 ? won / totalClosed : 0,
  };
}

function TrafficLight({
  value,
  avg,
  show,
  higherIsBetter = true,
}: {
  value: number;
  avg: number;
  show: boolean;
  higherIsBetter?: boolean;
}) {
  if (!show) return null;

  let status: "green" | "yellow" | "red" = "yellow";

  if (higherIsBetter) {
    if (value >= avg * 1.05) status = "green";
    else if (value <= avg * 0.95) status = "red";
  } else {
    if (value <= avg * 0.95) status = "green";
    else if (value >= avg * 1.05) status = "red";
  }

  const colorClass =
    status === "green"
      ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"
      : status === "red"
        ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
        : "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]";

  const avgLabel =
    avg < 10 && avg > 0 ? avg.toFixed(1) : formatNumber(Math.round(avg));

  return (
    <div className="mt-2 flex items-center gap-2">
      <div
        className={`h-3 w-3 rounded-full ${colorClass}`}
        title={`Média da equipe: ${avgLabel}`}
      />
      <span className="text-[10px] text-white/70">Média: {avgLabel}</span>
    </div>
  );
}

function TrendIndicator({
  current,
  previous,
  isPercentage = false,
  showPercentageChange = false,
  higherIsBetter = true,
}: {
  current: number;
  previous: number;
  isPercentage?: boolean;
  showPercentageChange?: boolean;
  higherIsBetter?: boolean;
}) {
  if (previous === 0 && current === 0) return null;

  const diff = current - previous;

  if (diff === 0) {
    return (
      <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-white/70">
        <span>=</span>
        <span>vs ant.</span>
      </div>
    );
  }

  const isPositive = diff > 0;
  const isGood = higherIsBetter ? isPositive : !isPositive;
  const colorClass = isGood ? "text-white" : "text-white/40";

  let displayValue = "0";

  if (showPercentageChange) {
    if (previous === 0) {
      displayValue = "100%";
    } else {
      const percentChange = (Math.abs(diff) / previous) * 100;
      displayValue = `${percentChange.toFixed(0)}%`;
    }
  } else if (isPercentage) {
    displayValue = `${Math.abs(diff).toFixed(0)}%`;
  } else {
    displayValue = formatNumber(Math.abs(diff));
  }

  return (
    <div className={`mt-1 flex items-center gap-1 text-[10px] font-medium ${colorClass}`}>
      <span>{isPositive ? "↗" : "↘"}</span>
      <span>{displayValue} vs ant.</span>
    </div>
  );
}

function InfoTooltip({
  formula,
  description,
}: {
  formula: string;
  description: string;
}) {
  return (
    <div className="relative group/tooltip hover:z-30">
      <span className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-[var(--color-lime)]/40 bg-[var(--color-lime)]/10 text-[11px] font-bold text-[var(--color-lime)] shadow-[0_0_8px_rgba(217,235,26,0.25)]">
        i
      </span>
      <div className="invisible absolute bottom-full right-0 z-30 mb-2 w-72 rounded-xl border border-[var(--color-lime)]/40 bg-[#121616] p-4 text-xs text-white/90 opacity-0 shadow-2xl transition-all group-hover/tooltip:visible group-hover/tooltip:opacity-100">
        <p className="mb-2 text-sm font-bold text-[var(--color-lime)]">
          Como é calculado:
        </p>
        <div className="mb-2 rounded-lg bg-white/5 p-2 font-mono text-[11px] text-white">
          {formula}
        </div>
        <p className="leading-relaxed text-white/80">{description}</p>
      </div>
    </div>
  );
}

function IconWrap({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg bg-[var(--color-lime)]/10 p-2 text-[var(--color-lime)]">
      {children}
    </div>
  );
}

function BriefcaseIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M8 7V5.8C8 4.8 8.8 4 9.8 4h4.4C15.2 4 16 4.8 16 5.8V7" />
      <path d="M4 9.2C4 8 5 7 6.2 7h11.6C19 7 20 8 20 9.2v8.6c0 1.2-1 2.2-2.2 2.2H6.2C5 20 4 19 4 17.8Z" />
      <path d="M4 12h16" />
    </svg>
  );
}

function CalendarCheckIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4" y="5" width="16" height="15" rx="2.2" />
      <path d="M8 3.8v2.4M16 3.8v2.4" />
      <path d="M8.5 12.2 10.7 14.4 15.5 9.6" />
    </svg>
  );
}

function TrendUpIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 16.5 9.2 11.3l3.2 3.2L20 7" />
      <path d="M15.8 7H20v4.2" />
    </svg>
  );
}

function ShieldCheckIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3.8 18.2 6v5.1c0 4.1-2.5 7.7-6.2 9.1-3.7-1.4-6.2-5-6.2-9.1V6Z" />
      <path d="m9.4 12 1.8 1.8 3.7-3.8" />
    </svg>
  );
}

function IndicatorCard({
  icon,
  ghostIcon,
  title,
  subtitle,
  tooltipFormula,
  tooltipDescription,
  macroValue,
  macroLabel,
  trend,
  trafficLight,
  supports,
  supportLayout = "stack",
}: {
  icon: ReactNode;
  ghostIcon: ReactNode;
  title: string;
  subtitle: string;
  tooltipFormula: string;
  tooltipDescription: string;
  macroValue: string;
  macroLabel: string;
  trend: ReactNode;
  trafficLight: ReactNode;
  supports: SupportItem[];
  supportLayout?: "stack" | "inline";
}) {
  return (
    <Card className="relative rounded-2xl border-2 border-[var(--color-lime)]/20 bg-[#121616] p-5 transition-colors hover:border-[var(--color-lime)]/60">
      <div className="absolute right-0 top-0 overflow-hidden rounded-tr-2xl p-4 opacity-10">
        {ghostIcon}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconWrap>{icon}</IconWrap>
          <h3 className="text-[18px] font-bold text-white">{title}</h3>
        </div>
        <InfoTooltip
          formula={tooltipFormula}
          description={tooltipDescription}
        />
      </div>

      <p className="mb-4 text-[14px] uppercase tracking-wider text-white/70">
        {subtitle}
      </p>

      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[34px] font-black text-white">{macroValue}</span>
          <span className="text-[14px] font-medium text-white/90">
            {macroLabel}
          </span>
          {trafficLight}
          {trend}
        </div>

        {supports.length > 0 ? (
          supportLayout === "inline" ? (
            <div className="flex gap-4 text-right">
              {supports.map((support) => (
                <div key={support.label} className="flex flex-col">
                  <span className="text-[24px] font-bold text-white">
                    {support.value}
                  </span>
                  <span className="text-[14px] uppercase text-white/70">
                    {support.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-end">
              {supports.map((support) => (
                <div
                  key={support.label}
                  className={support === supports[0] ? "" : "mt-1"}
                >
                  <div
                    className={
                      support.muted
                        ? "text-lg font-bold text-white/40"
                        : "text-[24px] font-bold text-white"
                    }
                  >
                    {support.value}
                  </div>
                  <div className="text-[14px] uppercase text-white/70">
                    {support.label}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : null}
      </div>
    </Card>
  );
}

export function CommercialKpis({
  rows,
  previousRows,
  teamRows,
  selectedOwnerId,
}: {
  rows: CommercialAggregatedMetric[];
  previousRows: CommercialAggregatedMetric[];
  teamRows: CommercialAggregatedMetric[];
  selectedOwnerId: string;
}) {
  const summaryStats = useMemo(() => summarizeRows(rows), [rows]);
  const prevSummaryStats = useMemo(
    () => summarizeRows(previousRows),
    [previousRows],
  );
  const trueTeamAvg = useMemo(() => summarizeRows(teamRows), [teamRows]);

  const showComparison = selectedOwnerId !== "all";

  return (
    <div className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <IndicatorCard
        icon={<BriefcaseIcon />}
        ghostIcon={<BriefcaseIcon className="h-16 w-16" />}
        title="Cobertura de Conta"
        subtitle="Carteira bem cuidada"
        tooltipFormula="(Negócios Atualizados / Total de Negócios Abertos) * 100"
        tooltipDescription="Mede a porcentagem de negócios que receberam alguma atualização no mês atual. Uma cobertura alta indica que a carteira está sendo bem cuidada."
        macroValue={`${(summaryStats.coverage * 100).toFixed(0)}%`}
        macroLabel="Cobertura"
        trafficLight={
          <TrafficLight
            value={summaryStats.coverage * 100}
            avg={trueTeamAvg.coverage * 100}
            show={showComparison}
          />
        }
        trend={
          <TrendIndicator
            current={summaryStats.coverage * 100}
            previous={prevSummaryStats.coverage * 100}
            isPercentage
          />
        }
        supports={[
          {
            value: formatNumber(summaryStats.totalDeals),
            label: "Abertos",
          },
        ]}
      />

      <IndicatorCard
        icon={<CalendarCheckIcon />}
        ghostIcon={<CalendarCheckIcon className="h-16 w-16" />}
        title="Atividades em Dia"
        subtitle="Rotina em ação"
        tooltipFormula="Soma das tarefas realizadas no período"
        tooltipDescription="Mostra o volume de ações realizadas. Na pontuação geral, tarefas em atraso reduzem o score final."
        macroValue={formatNumber(summaryStats.activities)}
        macroLabel="Realizadas"
        trafficLight={
          <TrafficLight
            value={summaryStats.activities}
            avg={trueTeamAvg.activities}
            show={showComparison}
          />
        }
        trend={
          <TrendIndicator
            current={summaryStats.activities}
            previous={prevSummaryStats.activities}
            showPercentageChange
          />
        }
        supports={[
          {
            value: formatNumber(summaryStats.activitiesTotal),
            label: "Totais",
          },
          {
            value: formatNumber(summaryStats.activitiesOverdue),
            label: "Atrasadas",
            muted: true,
          },
        ]}
        supportLayout="stack"
      />

      <IndicatorCard
        icon={<TrendUpIcon />}
        ghostIcon={<TrendUpIcon className="h-16 w-16" />}
        title="Evolução de Negócios"
        subtitle="Avanço no funil"
        tooltipFormula="Soma de negócios que avançaram de fase"
        tooltipDescription="Mede quantos negócios avançaram para uma etapa mais próxima do fechamento, indicando a velocidade e tração das oportunidades."
        macroValue={formatNumber(summaryStats.advances)}
        macroLabel="Avanços"
        trafficLight={
          <TrafficLight
            value={summaryStats.advances}
            avg={trueTeamAvg.advances}
            show={showComparison}
          />
        }
        trend={
          <TrendIndicator
            current={summaryStats.advances}
            previous={prevSummaryStats.advances}
            showPercentageChange
          />
        }
        supports={[
          {
            value: formatNumber(summaryStats.won),
            label: "Ganhos",
          },
          {
            value: formatNumber(summaryStats.lost),
            label: "Perdas",
          },
        ]}
        supportLayout="inline"
      />

      <IndicatorCard
        icon={<ShieldCheckIcon />}
        ghostIcon={<ShieldCheckIcon className="h-16 w-16" />}
        title="Qualidade no CRM"
        subtitle="Registro completo"
        tooltipFormula="100% - Taxa de Estagnação"
        tooltipDescription="Mede a saúde do funil. A taxa de estagnação é a porcentagem de negócios sem atividades recentes. Quanto maior a qualidade, menos negócios estagnados."
        macroValue={`${(summaryStats.quality * 100).toFixed(0)}%`}
        macroLabel="Saudáveis"
        trafficLight={
          <TrafficLight
            value={summaryStats.quality * 100}
            avg={trueTeamAvg.quality * 100}
            show={showComparison}
          />
        }
        trend={
          <TrendIndicator
            current={summaryStats.quality * 100}
            previous={prevSummaryStats.quality * 100}
            isPercentage
          />
        }
        supports={[
          {
            value: `${(summaryStats.conversion * 100).toFixed(0)}%`,
            label: "Conversão",
          },
        ]}
      />
    </div>
  );
}