"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  Formatter,
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

import { Card } from "@/components/ui/card";
import type { TimelinePoint } from "@/lib/dashboard/types";
import { formatCompact, formatCurrency } from "@/lib/dashboard/utils";

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

const tooltipFormatter: Formatter<ValueType, NameType> = (value, name) => {
  const numericValue = toNumber(value) ?? 0;
  const metricName = String(name ?? "").toLowerCase();

  if (metricName === "spend" || metricName === "investimento") {
    return [formatCurrency(numericValue), "Investimento"];
  }

  return [formatCompact(numericValue), "Resultado"];
};

export function TimelineChart({ data }: { data: TimelinePoint[] }) {
  return (
    <Card className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-white/45">
          Linha do tempo
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Investimento vs resultado
        </h2>
      </div>

      <div className="h-[280px] sm:h-[320px] min-[1700px]:h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="date"
              stroke="rgba(255,255,255,0.4)"
              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
            />
            <YAxis
              yAxisId="left"
              stroke="rgba(255,255,255,0.35)"
              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
              tickFormatter={(value: number) => formatCompact(Number(value))}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="rgba(255,255,255,0.35)"
              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
              tickFormatter={(value: number) => formatCompact(Number(value))}
            />
            <Tooltip
              contentStyle={{
                background: "#121616",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
              }}
              formatter={tooltipFormatter}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="spend"
              name="Investimento"
              stroke="var(--color-lime)"
              strokeWidth={3}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="results"
              name="Resultado"
              stroke="var(--color-purple)"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}