"use client";

import { Card } from "@/components/ui/card";
import type { CommercialSummary } from "@/lib/commercial/types";
import { formatNumber, formatPercent } from "@/lib/commercial/utils";

function deltaLabel(current: number, previous: number, inverse = false) {
  const diff = current - previous;
  if (diff === 0) return "sem mudança";
  const positive = inverse ? diff < 0 : diff > 0;
  const label = `${positive ? "+" : "-"}${Math.abs(diff).toFixed(
    Math.abs(diff) < 10 ? 1 : 0,
  )}`;
  return `${label} vs período anterior`;
}

function KpiCard({
  eyebrow,
  value,
  hint,
}: {
  eyebrow: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">
        {eyebrow}
      </p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-white/55">{hint}</p>
    </Card>
  );
}

export function CommercialKpis({
  summary,
  previousSummary,
}: {
  summary: CommercialSummary;
  previousSummary: CommercialSummary;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      <KpiCard
        eyebrow="Cobertura CRM"
        value={formatPercent(summary.coverage)}
        hint={deltaLabel(summary.coverage * 100, previousSummary.coverage * 100)}
      />
      <KpiCard
        eyebrow="Atividades concluídas"
        value={formatNumber(summary.activities)}
        hint={deltaLabel(summary.activities, previousSummary.activities)}
      />
      <KpiCard
        eyebrow="Avanços de etapa"
        value={formatNumber(summary.advances)}
        hint={deltaLabel(summary.advances, previousSummary.advances)}
      />
      <KpiCard
        eyebrow="Ganhos"
        value={formatNumber(summary.won)}
        hint={deltaLabel(summary.won, previousSummary.won)}
      />
      <KpiCard
        eyebrow="Perdas"
        value={formatNumber(summary.lost)}
        hint={deltaLabel(summary.lost, previousSummary.lost, true)}
      />
      <KpiCard
        eyebrow="Carteira aberta"
        value={formatNumber(summary.totalDeals)}
        hint={deltaLabel(summary.totalDeals, previousSummary.totalDeals)}
      />
    </div>
  );
}
