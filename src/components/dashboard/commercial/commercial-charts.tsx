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
import { Card } from "@/components/ui/card";
import type { CommercialWeeklyPoint } from "@/lib/commercial/types";

export function CommercialCharts({
  points,
  sellerName,
}: {
  points: CommercialWeeklyPoint[];
  sellerName: string;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.18em] text-white/45">
          Histórico
        </p>
        <h3 className="mt-2 text-lg font-semibold text-white">
          Performance semanal de {sellerName}
        </h3>
      </div>

      <div className="h-[320px] w-full">
        {points.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="weekLabel"
                stroke="rgba(255,255,255,0.45)"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="rgba(255,255,255,0.45)"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(15,17,24,0.96)",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="ownerScore"
                name={sellerName}
                stroke="var(--color-lime)"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="teamAverageScore"
                name="Média da equipe"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth={2}
                strokeDasharray="6 6"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-3xl border border-white/8 bg-white/3 text-sm text-white/50">
            Sem histórico suficiente para montar a série semanal.
          </div>
        )}
      </div>
    </Card>
  );
}
