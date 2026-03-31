import { Card } from "@/components/ui/card";
import type { KpiMetrics } from "@/lib/dashboard/types";
import {
  formatCompact,
  formatCurrency,
  formatPercent
} from "@/lib/dashboard/utils";

export function KpiGrid({ kpis }: { kpis: KpiMetrics }) {
  const items = [
    { label: "Investimento", value: formatCurrency(kpis.investment) },
    { label: "Cliques", value: formatCompact(kpis.clicks) },
    { label: kpis.resultLabel || "Resultado", value: formatCompact(kpis.results) },
    { label: "Custo / Resultado", value: formatCurrency(kpis.costPerResult) },
    { label: "Receita", value: formatCurrency(kpis.revenue) },
    { label: "CTR", value: formatPercent(kpis.ctr) },
    { label: "CPM", value: formatCurrency(kpis.cpm) }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="min-h-[118px] space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            {item.label}
          </p>
          <p className="text-3xl font-semibold text-[var(--color-lime)]">
            {item.value}
          </p>
        </Card>
      ))}
    </div>
  );
}
