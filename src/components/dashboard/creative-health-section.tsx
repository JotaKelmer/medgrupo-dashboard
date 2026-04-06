import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type {
  CreativeHealthRow,
  CreativeHealthStatus,
  CreativeHealthSummary,
} from "@/lib/dashboard/types";
import { formatCompact, formatCurrency, formatPercent } from "@/lib/dashboard/utils";

type Props = {
  summary: CreativeHealthSummary;
  rows: CreativeHealthRow[];
};

type NormalizedStatus = "good" | "warning" | "critical";

function normalizeStatus(status: CreativeHealthStatus): NormalizedStatus {
  if (status === "replace" || status === "critical") return "critical";
  if (status === "warning") return "warning";
  return "good";
}

function getStatusLabel(status: CreativeHealthStatus) {
  const normalized = normalizeStatus(status);

  if (normalized === "critical") return "Crítico";
  if (normalized === "warning") return "Atenção";
  return "Saudável";
}

function getStatusVariant(status: CreativeHealthStatus): "good" | "warning" | "critical" {
  return normalizeStatus(status);
}

function formatFrequency(value: number) {
  return value.toFixed(1).replace(".", ",");
}

function mergeSummary(summary: CreativeHealthSummary) {
  return {
    good: summary.good,
    warning: summary.warning,
    critical: summary.critical + summary.replace,
  };
}

export function CreativeHealthSection({ summary, rows }: Props) {
  const normalizedSummary = mergeSummary(summary);

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">Saudáveis</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="text-3xl font-semibold text-white">
              {formatCompact(normalizedSummary.good)}
            </p>
            <Badge variant="good">Saudável</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/58">
            Criativos com frequência controlada e eficiência sustentável.
          </p>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">Em atenção</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="text-3xl font-semibold text-white">
              {formatCompact(normalizedSummary.warning)}
            </p>
            <Badge variant="warning">Atenção</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/58">
            Criativos que pedem monitoramento e preparação de nova variação.
          </p>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">Críticos</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="text-3xl font-semibold text-white">
              {formatCompact(normalizedSummary.critical)}
            </p>
            <Badge variant="critical">Crítico</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/58">
            Criativos que já pedem substituição imediata.
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-white/8 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">
            Saúde dos criativos
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Leitura operacional em PT-BR
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-white/3 text-left text-white/45">
              <tr>
                <th className="px-5 py-3 font-medium">Criativo</th>
                <th className="px-5 py-3 font-medium">Campanha</th>
                <th className="px-5 py-3 font-medium">Plataforma</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Frequência</th>
                <th className="px-5 py-3 text-right font-medium">CTR</th>
                <th className="px-5 py-3 text-right font-medium">Custo / Resultado</th>
                <th className="px-5 py-3 text-right font-medium">Investimento</th>
                <th className="px-5 py-3 text-right font-medium">Resultados</th>
                <th className="px-5 py-3 font-medium">Recomendação</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.adId} className="border-t border-white/6 text-white/78">
                  <td className="px-5 py-4">
                    <div className="max-w-[220px] whitespace-normal leading-6">
                      {row.adName}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="max-w-[220px] whitespace-normal leading-6">
                      {row.campaignName}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <Badge variant="info">
                      {row.platform === "meta" ? "Meta Ads" : "Google Ads"}
                    </Badge>
                  </td>

                  <td className="px-5 py-4">
                    <Badge variant={getStatusVariant(row.status)}>
                      {getStatusLabel(row.status)}
                    </Badge>
                  </td>

                  <td className="px-5 py-4 text-right">{formatFrequency(row.frequency)}</td>
                  <td className="px-5 py-4 text-right">{formatPercent(row.ctr)}</td>
                  <td className="px-5 py-4 text-right">
                    {formatCurrency(row.costPerResult)}
                  </td>
                  <td className="px-5 py-4 text-right">{formatCurrency(row.spend)}</td>
                  <td className="px-5 py-4 text-right">{formatCompact(row.results)}</td>

                  <td className="px-5 py-4">
                    <div className="max-w-[320px] whitespace-normal leading-6 text-white/62">
                      {row.recommendation}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
