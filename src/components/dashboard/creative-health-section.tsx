"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { CreativeHealthRow, CreativeHealthSummary } from "@/lib/dashboard/types";
import { formatCurrency, formatPercent } from "@/lib/dashboard/utils";

const ITEMS_PER_PAGE = 5;

function rowVariant(status: CreativeHealthRow["status"]) {
  switch (status) {
    case "good":
      return "good";
    case "warning":
      return "warning";
    case "replace":
      return "replace";
    case "critical":
      return "critical";
    default:
      return "info";
  }
}

export function CreativeHealthSection({
  summary,
  rows
}: {
  summary: CreativeHealthSummary;
  rows: CreativeHealthRow[];
}) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rows.length / ITEMS_PER_PAGE));

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return rows.slice(start, end);
  }, [page, rows]);

  useEffect(() => {
    setPage(1);
  }, [rows]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">
            Saúde dos criativos
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Frequência com leitura inteligente (Meta Ads)
          </h2>
        </div>

        <p className="max-w-xl text-sm leading-6 text-white/55">
          Acompanhe os criativos que mais sofrem desgaste no Meta Ads e concentre a ação operacional nos ativos que pedem nova variação.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric label="Saudáveis" value={summary.good} tone="text-[var(--color-lime)]" />
        <SummaryMetric label="Atenção" value={summary.warning} tone="text-[var(--color-teal)]" />
        <SummaryMetric label="Trocar" value={summary.replace} tone="text-[var(--color-purple)]" />
        <SummaryMetric label="Crítico" value={summary.critical} tone="text-rose-300" />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-white/8">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-white/3 text-left text-white/45">
              <tr>
                <th className="px-4 py-3 font-medium">Criativo</th>
                <th className="px-4 py-3 font-medium">Campanha</th>
                <th className="px-4 py-3 text-right font-medium">Freq.</th>
                <th className="px-4 py-3 text-right font-medium">CTR</th>
                <th className="px-4 py-3 text-right font-medium">Custo/Res.</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ação</th>
              </tr>
            </thead>

            <tbody>
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row) => (
                  <tr key={row.adId} className="border-t border-white/6 align-top text-white/78">
                    <td className="px-4 py-4 font-medium text-white">
                      <div className="max-w-[260px] whitespace-normal leading-6">
                        {row.adName}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-white/60">
                      <div className="max-w-[260px] whitespace-normal leading-6">
                        {row.campaignName}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right">{row.frequency.toFixed(1)}</td>
                    <td className="px-4 py-4 text-right">{formatPercent(row.ctr)}</td>
                    <td className="px-4 py-4 text-right">
                      {formatCurrency(row.costPerResult)}
                    </td>

                    <td className="px-4 py-4">
                      <Badge variant={rowVariant(row.status)}>{row.status}</Badge>
                    </td>

                    <td className="px-4 py-4 text-white/65">
                      <div className="max-w-[260px] whitespace-normal leading-6">
                        {row.recommendation}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-white/6">
                  <td colSpan={7} className="px-4 py-8 text-center text-white/45">
                    Nenhum criativo Meta encontrado para o filtro atual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/45">
            Página {page} de {totalPages}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="rounded-xl border border-white/10 bg-white/4 px-3 py-2 text-sm text-white/75 transition hover:bg-white/7 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>

            <div className="flex flex-wrap items-center gap-1">
              {Array.from({ length: totalPages }, (_, index) => {
                const pageNumber = index + 1;
                const isActive = pageNumber === page;

                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`h-9 min-w-9 rounded-xl border px-3 text-sm transition ${
                      isActive
                        ? "border-white/20 bg-white/12 text-white"
                        : "border-white/10 bg-white/4 text-white/65 hover:bg-white/7"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              className="rounded-xl border border-white/10 bg-white/4 px-3 py-2 text-sm text-white/75 transition hover:bg-white/7 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SummaryMetric({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-white/45">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}