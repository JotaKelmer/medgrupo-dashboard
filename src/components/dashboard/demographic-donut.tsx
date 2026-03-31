"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type {
  Formatter,
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

import { Card } from "@/components/ui/card";
import type { DemographicSlice } from "@/lib/dashboard/types";
import { formatNumber } from "@/lib/dashboard/utils";

const colors = [
  "var(--color-lime)",
  "var(--color-teal)",
  "var(--color-purple)",
  "#2E3A3A",
  "#38484A",
];

function toNumber(value: ValueType | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];

    if (typeof first === "number" && Number.isFinite(first)) {
      return first;
    }

    if (typeof first === "string") {
      const parsed = Number(first);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }

  return null;
}

const tooltipFormatter: Formatter<ValueType, NameType> = (value) => {
  const numericValue = toNumber(value);
  return [formatNumber(numericValue ?? 0), "Impressões"];
};

export function DemographicDonut({ data }: { data: DemographicSlice[] }) {
  const hasData = data.some((slice) => slice.value > 0);

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-white/45">
          Demográficos
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Distribuição por faixa etária
        </h2>
      </div>

      {!hasData ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-5 py-6">
          <p className="text-sm font-medium text-white/78">
            Sem dados demográficos no período filtrado.
          </p>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Esse bloco depende da tabela{" "}
            <code className="text-white/70">demographic_metrics</code>. Para
            Meta Ads, rode a sincronização nova. Para Google Ads, esse
            detalhamento pode não existir para todas as contas e filtros.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-3">
            {data.map((slice, index) => (
              <div
                key={slice.name}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="truncate text-sm text-white">
                    {slice.name}
                  </span>
                </div>
                <span className="text-sm font-semibold text-white/75">
                  {formatNumber(slice.value)}
                </span>
              </div>
            ))}
          </div>

          <div className="h-[240px] sm:h-[280px] xl:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={{
                    background: "#121616",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 16,
                  }}
                  formatter={tooltipFormatter}
                />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={102}
                  paddingAngle={2}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Card>
  );
}