"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
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
import type { CreativeHealthRow } from "@/lib/dashboard/types";
import { formatPercent } from "@/lib/dashboard/utils";

const groups = [
  { key: "good", label: "Saudáveis", color: "var(--color-lime)" },
  { key: "warning", label: "Atenção", color: "var(--color-teal)" },
  { key: "replace", label: "Trocar", color: "var(--color-purple)" },
  { key: "critical", label: "Crítico", color: "#fda4af" },
] as const;

function toNumber(value: ValueType | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (typeof first === "number" && Number.isFinite(first)) return first;
    if (typeof first === "string") {
      const parsed = Number(first);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }
  return null;
}

const tooltipFormatter: Formatter<ValueType, NameType> = (value, name) => {
  const numericValue = toNumber(value);
  const metricName = String(name ?? "").toLowerCase();

  if (metricName === "ctr") {
    return [formatPercent(numericValue ?? 0), "CTR"];
  }

  return [numericValue !== null ? numericValue.toFixed(1) : "-", "Frequência"];
};

export function CreativeMapPanel({ rows }: { rows: CreativeHealthRow[] }) {
  if (!rows.length) {
    return (
      <Card>
        <p className="text-sm text-white/60">
          Nenhum dado de criativo disponível para montar o mapa visual.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-white/45">
          Mapa visual
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Desgaste x resposta do criativo
        </h2>
      </div>

      <div className="h-[260px] sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" />
            <XAxis
              type="number"
              dataKey="frequency"
              name="Frequência"
              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
              stroke="rgba(255,255,255,0.35)"
            />
            <YAxis
              type="number"
              dataKey="ctr"
              name="CTR"
              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
              stroke="rgba(255,255,255,0.35)"
              tickFormatter={(value: number) => formatPercent(value)}
            />
            <Tooltip
              cursor={{ strokeDasharray: "4 4" }}
              contentStyle={{
                background: "#121616",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
              }}
              formatter={tooltipFormatter}
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload as CreativeHealthRow | undefined;
                return item?.adName ?? "Criativo";
              }}
            />

            {groups.map((group) => (
              <Scatter
                key={group.key}
                name={group.label}
                data={rows.filter((row) => row.status === group.key)}
                fill={group.color}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-2 text-sm text-white/55">
        <p>Quanto mais à direita, maior o desgaste. Quanto mais abaixo, menor a resposta em CTR.</p>
      </div>
    </Card>
  );
}
