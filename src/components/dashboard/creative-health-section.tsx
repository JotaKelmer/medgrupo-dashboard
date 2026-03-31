"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { CreativeHealthRow, CreativeHealthSummary } from "@/lib/dashboard/types";
import { formatCurrency, formatPercent } from "@/lib/dashboard/utils";

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
  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">
            Saúde dos criativos
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Frequência com leitura inteligente
          </h2>
        </div>

        <p className="max-w-xl text-sm leading-6 text-white/55">
          Acompanhe os criativos que mais sofrem desgaste e concentre a ação
          operacional nos ativos que pedem nova variação.
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
              {rows.map((row) => (
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
              ))}
            </tbody>
          </table>
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
