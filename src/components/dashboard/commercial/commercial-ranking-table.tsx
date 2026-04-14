"use client";

import { useMemo, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import type { CommercialAggregatedMetric } from "@/lib/commercial/types";
import { formatNumber } from "@/lib/commercial/utils";

function buildSegments(rows: CommercialAggregatedMetric[]) {
  const total = rows.length;

  if (!total) {
    return {
      topA: [] as CommercialAggregatedMetric[],
      middle70: [] as CommercialAggregatedMetric[],
      bottomC: [] as CommercialAggregatedMetric[],
    };
  }

  const topCount = Math.max(1, Math.round(total * 0.2));
  const bottomCount = Math.max(1, Math.round(total * 0.1));

  const actualTopCount = Math.min(topCount, total);
  const actualBottomCount = Math.min(bottomCount, total - actualTopCount);

  return {
    topA: rows.slice(0, actualTopCount),
    middle70: rows.slice(actualTopCount, total - actualBottomCount),
    bottomC: rows.slice(total - actualBottomCount),
  };
}

function InfoIcon() {
  return (
    <span className="text-[11px] text-white/50 transition-colors group-hover/tooltip:text-white">
      i
    </span>
  );
}

function BubbleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M7 18.5H5a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 5 4.5h14A1.5 1.5 0 0 1 20.5 6v11a1.5 1.5 0 0 1-1.5 1.5H12l-4 3z" />
    </svg>
  );
}

function HeaderTooltip({
  label,
  tooltip,
  emphasized = false,
}: {
  label: string;
  tooltip: string;
  emphasized?: boolean;
}) {
  return (
    <div className="group/tooltip relative flex items-center justify-end gap-1">
      <span className={emphasized ? "text-[var(--color-lime)]" : ""}>{label}</span>
      <InfoIcon />
      <div className="invisible absolute right-0 top-full z-30 mt-2 w-64 rounded-lg border border-[var(--color-lime)]/20 bg-[#121616] p-3 text-left text-xs font-normal text-white/90 opacity-0 shadow-xl transition-all group-hover/tooltip:visible group-hover/tooltip:opacity-100">
        <p className="leading-relaxed text-white/80">{tooltip}</p>
      </div>
    </div>
  );
}

function ScoreTooltip() {
  return (
    <div className="group/tooltip relative flex items-center justify-end gap-1">
      <span className="text-[var(--color-lime)]">Pontuação</span>
      <InfoIcon />
      <div className="invisible absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-[var(--color-lime)]/40 bg-[#121616] p-4 text-left text-xs font-normal text-white/90 opacity-0 shadow-2xl transition-all group-hover/tooltip:visible group-hover/tooltip:opacity-100">
        <p className="mb-2 text-sm font-bold text-[var(--color-lime)]">
          Cálculo da Pontuação:
        </p>
        <div className="mb-2 rounded-lg bg-white/5 p-2 font-mono text-[11px] text-white">
          Cob.(300) + Qual.(300) + Ativ.(100) + Avanços(50/cada) + Ganhos(100/cada) - Perdas(50/cada)
        </div>
        <p className="leading-relaxed text-white/80">
          Métrica geral de desempenho baseada nos 4 pilares.
        </p>
      </div>
    </div>
  );
}

function PositionBadge({
  position,
  highlighted,
}: {
  position: number;
  highlighted: boolean;
}) {
  if (!highlighted) {
    return <span className="ml-2 font-mono text-white/70">{position}</span>;
  }

  const className =
    position === 1
      ? "border-[var(--color-lime)]/50 bg-[var(--color-lime)]/20 text-[var(--color-lime)]"
      : position === 2
        ? "border-white/50 bg-white/20 text-white/90"
        : "border-white/30 bg-white/10 text-white/80";

  return (
    <span
      className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${className}`}
    >
      {position}
    </span>
  );
}

function SectionRow({
  label,
  muted = false,
}: {
  label: string;
  muted?: boolean;
}) {
  return (
    <tr className="border-t-2 border-white/10 bg-white/5">
      <td
        colSpan={11}
        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest lg:px-5 ${
          muted ? "text-white/40" : "text-white/70"
        }`}
      >
        {label}
      </td>
    </tr>
  );
}

function qualityPercent(row: CommercialAggregatedMetric) {
  return ((1 - row.stagnantPercent) * 100).toFixed(1);
}

function conversionPercent(row: CommercialAggregatedMetric) {
  const totalClosed = row.dealsWonYesterday + row.dealsLostYesterday;
  if (!totalClosed) return "0";
  return ((row.dealsWonYesterday / totalClosed) * 100).toFixed(0);
}

function TableRow({
  row,
  position,
  highlightPosition,
  onOpenFeedback,
}: {
  row: CommercialAggregatedMetric;
  position: number;
  highlightPosition: boolean;
  onOpenFeedback: (row: CommercialAggregatedMetric) => void;
}) {
  return (
    <tr className="group border-t border-white/10 transition-colors hover:bg-[var(--color-lime)]/10">
      <td className="whitespace-nowrap px-4 py-4 lg:px-5">
        <PositionBadge position={position} highlighted={highlightPosition} />
      </td>

      <td className="whitespace-nowrap px-4 py-4 font-bold text-white transition-colors group-hover:text-[var(--color-lime)] lg:px-5">
        {row.ownerName}
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-right font-mono font-bold text-[var(--color-lime)] lg:px-5">
        {formatNumber(row.score)}
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-white/90 lg:px-5">
        {formatNumber(row.totalOpenDeals)}
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-white lg:px-5">
        {(row.coveragePercent * 100).toFixed(1)}%
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-white lg:px-5">
        {row.activitiesDoneYesterday > 0 ? (
          formatNumber(row.activitiesDoneYesterday)
        ) : (
          <span className="text-white/40">
            0 {row.activitiesOverdue > 0 ? `(-${row.activitiesOverdue * 10})` : ""}
          </span>
        )}
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-white lg:px-5">
        {formatNumber(row.dealsAdvancedYesterday)}
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-white lg:px-5">
        {formatNumber(row.dealsWonYesterday)}
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-white lg:px-5">
        {formatNumber(row.dealsLostYesterday)}
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-white lg:px-5">
        <div className="flex flex-col items-end">
          <span>{qualityPercent(row)}%</span>
          <span className="text-[10px] text-white/70">
            Conv: {conversionPercent(row)}%
          </span>
        </div>
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-center lg:px-5">
        <button
          type="button"
          onClick={() => onOpenFeedback(row)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#121616]/80 text-white/90 transition-colors hover:bg-white/10"
          title="Feedback e IA"
        >
          <BubbleIcon />
        </button>
      </td>
    </tr>
  );
}

export function CommercialRankingTable({
  rows,
  selectedOwnerId,
  onOpenFeedback,
}: {
  rows: CommercialAggregatedMetric[];
  selectedOwnerId: string;
  onOpenFeedback: (row: CommercialAggregatedMetric) => void;
}) {
  const leaderboardGroups = useMemo(() => buildSegments(rows), [rows]);

  const renderRows = (
    sectionRows: CommercialAggregatedMetric[],
    startIndex: number,
    selectedAll: boolean,
  ): ReactNode =>
    sectionRows.map((row, index) => (
      <TableRow
        key={row.ownerId}
        row={row}
        position={startIndex + index + 1}
        highlightPosition={selectedAll && startIndex + index < 3}
        onOpenFeedback={onOpenFeedback}
      />
    ));

  return (
    <Card className="mb-8 p-0">
      <div className="flex items-center gap-3 rounded-t-xl border-b border-[var(--color-lime)]/20 bg-[#121616]/50 px-6 py-5">
        <span className="text-[var(--color-lime)]">◎</span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">
          Tabela de Classificação
        </h3>
      </div>

      <div className="w-full overflow-x-auto overflow-y-visible rounded-b-xl">
        <table className="w-full min-w-[1180px] border-collapse text-left text-sm xl:min-w-0">
          <thead className="border-b border-[var(--color-lime)]/20 bg-[#121616]/50 text-xs uppercase text-white/70">
            <tr>
              <th className="whitespace-nowrap px-4 py-4 font-bold lg:px-5">Pos</th>
              <th className="whitespace-nowrap px-4 py-4 font-bold lg:px-5">
                Vendedor
              </th>
              <th className="whitespace-nowrap px-4 py-4 text-right font-bold lg:px-5">
                <ScoreTooltip />
              </th>
              <th className="whitespace-nowrap px-4 py-4 text-right font-bold lg:px-5">
                <HeaderTooltip
                  label="Negócios"
                  tooltip="Total de negócios abertos na carteira do vendedor."
                />
              </th>
              <th className="whitespace-nowrap px-4 py-4 text-right font-bold lg:px-5">
                <HeaderTooltip
                  label="Cobertura"
                  tooltip="Porcentagem de negócios com alguma atualização no mês atual."
                />
              </th>
              <th className="whitespace-nowrap px-4 py-4 text-right font-bold lg:px-5">
                <HeaderTooltip
                  label="Atividades"
                  tooltip="Total de tarefas realizadas no período."
                />
              </th>
              <th className="whitespace-nowrap px-4 py-4 text-right font-bold lg:px-5">
                <HeaderTooltip
                  label="Avanços"
                  tooltip="Número de negócios que avançaram de fase no funil."
                />
              </th>
              <th className="whitespace-nowrap px-4 py-4 text-right font-bold lg:px-5">
                <HeaderTooltip
                  label="Ganhos"
                  tooltip="Negócios fechados com sucesso no período."
                />
              </th>
              <th className="whitespace-nowrap px-4 py-4 text-right font-bold lg:px-5">
                <HeaderTooltip
                  label="Perdas"
                  tooltip="Negócios perdidos no período."
                />
              </th>
              <th className="whitespace-nowrap px-4 py-4 text-right font-bold lg:px-5">
                <HeaderTooltip
                  label="Qualidade"
                  tooltip="100% - Taxa de Estagnação. Indica a saúde da carteira."
                />
              </th>
              <th className="whitespace-nowrap px-4 py-4 text-center font-bold lg:px-5">
                Ações
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/10">
            {selectedOwnerId === "all" ? (
              <>
                {leaderboardGroups.topA.length > 0 ? (
                  <>
                    <SectionRow label="Top 20% (Top A) - Bônus e Promoções" />
                    {renderRows(leaderboardGroups.topA, 0, true)}
                  </>
                ) : null}

                {leaderboardGroups.middle70.length > 0 ? (
                  <>
                    <SectionRow label="70% Normais (The Vital 70) - Manter e Treinar" />
                    {renderRows(
                      leaderboardGroups.middle70,
                      leaderboardGroups.topA.length,
                      true,
                    )}
                  </>
                ) : null}

                {leaderboardGroups.bottomC.length > 0 ? (
                  <>
                    <SectionRow
                      label="Bottom 10% (Bottom C) - Em Avaliação"
                      muted
                    />
                    {renderRows(
                      leaderboardGroups.bottomC,
                      leaderboardGroups.topA.length +
                        leaderboardGroups.middle70.length,
                      true,
                    )}
                  </>
                ) : null}
              </>
            ) : (
              renderRows(rows, 0, false)
            )}

            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-white/70 lg:px-5">
                  Nenhum dado encontrado para o período selecionado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}