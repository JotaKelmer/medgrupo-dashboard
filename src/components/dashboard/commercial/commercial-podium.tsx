"use client";

import { Card } from "@/components/ui/card";
import type { CommercialAggregatedMetric } from "@/lib/commercial/types";
import { formatNumber } from "@/lib/commercial/utils";

function PodiumSlot({
  position,
  row,
  emphasis = false,
}: {
  position: number;
  row?: CommercialAggregatedMetric;
  emphasis?: boolean;
}) {
  if (!row) {
    return <div className="hidden md:block" />;
  }

  return (
    <div className="flex w-full flex-col items-center justify-end">
      <div
        className={[
          "mb-4 flex h-16 w-16 items-center justify-center rounded-full border text-xl font-semibold",
          emphasis
            ? "border-[var(--color-lime)] bg-[var(--color-lime)]/10 text-[var(--color-lime)] shadow-[0_0_40px_rgba(217,235,26,0.15)]"
            : "border-white/15 bg-white/5 text-white/80",
        ].join(" ")}
      >
        {position}
      </div>

      <div
        className={[
          "w-full rounded-3xl border px-4 py-5 text-center",
          emphasis
            ? "border-[var(--color-lime)]/35 bg-[linear-gradient(180deg,rgba(217,235,26,0.12),rgba(255,255,255,0.04))]"
            : "border-white/10 bg-white/4",
        ].join(" ")}
      >
        <p className={emphasis ? "text-lg font-semibold text-white" : "text-base font-semibold text-white/90"}>
          {row.ownerName}
        </p>
        <p className={emphasis ? "mt-2 text-sm text-[var(--color-lime)]" : "mt-2 text-sm text-white/60"}>
          {formatNumber(row.score)} pts
        </p>
        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-white/40">
          {formatNumber(row.dealsWonYesterday)} ganhos · {formatNumber(row.dealsAdvancedYesterday)} avanços
        </p>
      </div>
    </div>
  );
}

export function CommercialPodium({ rows }: { rows: CommercialAggregatedMetric[] }) {
  if (!rows.length) return null;

  return (
    <Card className="overflow-hidden p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            Ranking
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Top performers
          </h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs text-white/65">
          Score composto por cobertura, qualidade e avanço
        </span>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3 md:items-end">
        <PodiumSlot position={2} row={rows[1]} />
        <PodiumSlot position={1} row={rows[0]} emphasis />
        <PodiumSlot position={3} row={rows[2]} />
      </div>
    </Card>
  );
}
