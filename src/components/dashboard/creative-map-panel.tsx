import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { CreativeHealthRow, CreativeHealthStatus } from "@/lib/dashboard/types";
import { formatCurrency, formatPercent } from "@/lib/dashboard/utils";

type Props = {
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

function formatFrequency(value: number) {
  return value.toFixed(1).replace(".", ",");
}

function formatTrend(value: number) {
  const normalized = Number.isFinite(value) ? value : 0;
  const prefix = normalized > 0 ? "+" : "";
  return `${prefix}${normalized.toFixed(1).replace(".", ",")}%`;
}

export function CreativeMapPanel({ rows }: Props) {
  const visibleRows = rows.slice(0, 8);

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-white/45">
          Mapa de criativos
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Priorização visual por criticidade
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/58">
          Os cartões abaixo já tratam “Trocar” como “Crítico” e exibem tudo em PT-BR.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {visibleRows.map((row) => {
          const normalizedStatus = normalizeStatus(row.status);

          return (
            <div
              key={row.adId}
              className="rounded-2xl border border-white/8 bg-white/4 p-4"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{row.adName}</p>
                    <p className="mt-1 text-sm text-white/58">{row.campaignName}</p>
                  </div>

                  <Badge variant={normalizedStatus}>{getStatusLabel(row.status)}</Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="info">
                    {row.platform === "meta" ? "Meta Ads" : "Google Ads"}
                  </Badge>
                  <Badge variant="info">Freq. {formatFrequency(row.frequency)}</Badge>
                  <Badge variant="info">CTR {formatPercent(row.ctr)}</Badge>
                  <Badge variant="info">CPR {formatCurrency(row.costPerResult)}</Badge>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-black/15 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
                      Tendência freq.
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {formatTrend(row.frequencyTrend)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/15 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
                      Tendência CTR
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {formatTrend(row.ctrTrend)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/15 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
                      Tendência custo
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {formatTrend(row.costTrend)}
                    </p>
                  </div>
                </div>

                <p className="text-sm leading-6 text-white/60">{row.recommendation}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
