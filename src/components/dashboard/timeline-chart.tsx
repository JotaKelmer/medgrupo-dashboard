"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card } from "@/components/ui/card";
import type { TimelinePoint } from "@/lib/dashboard/types";
import { formatCompact, formatCurrency } from "@/lib/dashboard/utils";

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
              tickFormatter={(value) => formatCompact(Number(value))}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="rgba(255,255,255,0.35)"
              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
              tickFormatter={(value) => formatCompact(Number(value))}
            />
            <Tooltip
              contentStyle={{
                background: "#121616",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16
              }}
              formatter={(value: number, name: string) =>
                name === "spend"
                  ? [formatCurrency(value), "Investimento"]
                  : [formatCompact(value), "Resultado"]
              }
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
