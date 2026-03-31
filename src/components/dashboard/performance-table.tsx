import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { PerformanceRow } from "@/lib/dashboard/types";
import {
  formatCompact,
  formatCurrency,
  formatPercent
} from "@/lib/dashboard/utils";

export function PerformanceTable({ rows }: { rows: PerformanceRow[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-white/8 px-5 py-4">
        <p className="text-xs uppercase tracking-[0.24em] text-white/45">
          Visão detalhada
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Campanhas com maior peso no período
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[960px] w-full text-sm">
          <thead className="bg-white/3 text-left text-white/45">
            <tr>
              <th className="px-5 py-3 font-medium">Campanha</th>
              <th className="px-5 py-3 font-medium">Plataforma</th>
              <th className="px-5 py-3 text-right font-medium">Cliques</th>
              <th className="px-5 py-3 text-right font-medium">Resultado</th>
              <th className="px-5 py-3 text-right font-medium">CTR</th>
              <th className="px-5 py-3 text-right font-medium">Investimento</th>
              <th className="px-5 py-3 text-right font-medium">Custo / Resultado</th>
              <th className="px-5 py-3 text-right font-medium">Receita</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-white/6 text-white/78">
                <td className="px-5 py-4">
                  <div className="max-w-[260px] whitespace-normal leading-6">
                    {row.campaignName}
                  </div>
                </td>

                <td className="px-5 py-4">
                  <Badge variant={row.platform === "meta" ? "good" : "replace"}>
                    {row.platform === "meta" ? "Meta Ads" : "Google Ads"}
                  </Badge>
                </td>

                <td className="px-5 py-4 text-right">{formatCompact(row.clicks)}</td>
                <td className="px-5 py-4 text-right">{formatCompact(row.results)}</td>
                <td className="px-5 py-4 text-right">{formatPercent(row.ctr)}</td>
                <td className="px-5 py-4 text-right text-[var(--color-lime)]">
                  {formatCurrency(row.spend)}
                </td>
                <td className="px-5 py-4 text-right">
                  {formatCurrency(row.costPerResult)}
                </td>
                <td className="px-5 py-4 text-right">
                  {formatCurrency(row.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
