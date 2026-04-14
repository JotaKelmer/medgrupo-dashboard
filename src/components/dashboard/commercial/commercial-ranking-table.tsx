"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CommercialAggregatedMetric } from "@/lib/commercial/types";
import { formatNumber } from "@/lib/commercial/utils";

function qualityBadge(row: CommercialAggregatedMetric) {
  const health = 1 - row.stagnantPercent;

  if (health >= 0.82) return { label: "Saudável", variant: "good" as const };
  if (health >= 0.65) return { label: "Atenção", variant: "warning" as const };
  return { label: "Crítico", variant: "critical" as const };
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
  const showAction = selectedOwnerId !== "all";
  const renderedRows = useMemo(() => rows, [rows]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-4 border-b border-white/8 bg-white/3 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">
            Classificação
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            Tabela de desempenho
          </h3>
        </div>
        <span className="text-xs text-white/50">
          Score = cobertura + qualidade + atividades + avanço
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-white/[0.02] text-left text-white/45">
            <tr>
              <th className="px-5 py-3 font-medium">#</th>
              <th className="px-5 py-3 font-medium">Vendedor</th>
              <th className="px-5 py-3 text-right font-medium">Score</th>
              <th className="px-5 py-3 text-right font-medium">Negócios</th>
              <th className="px-5 py-3 text-right font-medium">Cobertura</th>
              <th className="px-5 py-3 text-right font-medium">Atividades</th>
              <th className="px-5 py-3 text-right font-medium">Avanços</th>
              <th className="px-5 py-3 text-right font-medium">Ganhos</th>
              <th className="px-5 py-3 font-medium">Saúde</th>
              {showAction ? (
                <th className="px-5 py-3 text-right font-medium">Ação</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {renderedRows.map((row, index) => {
              const badge = qualityBadge(row);
              return (
                <tr
                  key={row.ownerId}
                  className="border-t border-white/6 text-white/80 transition hover:bg-white/[0.03]"
                >
                  <td className="px-5 py-4">{index + 1}</td>
                  <td className="px-5 py-4 font-medium text-white">
                    {row.ownerName}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-[var(--color-lime)]">
                    {formatNumber(row.score)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {formatNumber(row.totalOpenDeals)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {(row.coveragePercent * 100).toFixed(1)}%
                  </td>
                  <td className="px-5 py-4 text-right">
                    {formatNumber(row.activitiesDoneYesterday)}
                    {row.activitiesOverdue > 0 ? (
                      <span className="ml-1 text-xs text-white/35">
                        (-{row.activitiesOverdue})
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {formatNumber(row.dealsAdvancedYesterday)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {formatNumber(row.dealsWonYesterday)}
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </td>
                  {showAction ? (
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenFeedback(row)}
                        className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        Abrir feedback
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}

            {!renderedRows.length ? (
              <tr>
                <td
                  colSpan={showAction ? 10 : 9}
                  className="px-5 py-10 text-center text-white/45"
                >
                  Nenhum vendedor encontrado para esse período.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
