"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CustomMetricDefinitionRecord } from "@/lib/dashboard/types";

export function CustomMetricManager({
  workspaceId,
  initialMetrics
}: {
  workspaceId: string;
  initialMetrics: CustomMetricDefinitionRecord[];
}) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    metricKey: "",
    metricLabel: "",
    description: ""
  });

  async function save() {
    setMessage("");

    try {
      const response = await fetch("/api/custom-metrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          workspaceId,
          ...form
        })
      });

      if (!response.ok) throw new Error("Falha ao salvar.");

      const payload = await response.json();
      setMetrics((current) => [
        ...current,
        {
          id: payload.id ?? crypto.randomUUID(),
          workspaceId,
          metricKey: form.metricKey,
          metricLabel: form.metricLabel,
          description: form.description,
          dataType: "number",
          isActive: true
        }
      ]);
      setForm({ metricKey: "", metricLabel: "", description: "" });
      setMessage("Métrica customizada criada.");
    } catch (error) {
      console.error(error);
      setMessage("Não foi possível salvar no Supabase.");
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-white/45">Métricas customizadas</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Cadastre métricas livres para os funis</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-white/45">metric_key</label>
          <Input value={form.metricKey} onChange={(event) => setForm((current) => ({ ...current, metricKey: event.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-white/45">Rótulo</label>
          <Input value={form.metricLabel} onChange={(event) => setForm((current) => ({ ...current, metricLabel: event.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-white/45">Descrição</label>
          <Input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save}>Salvar métrica</Button>
        {message ? <span className="text-sm text-white/60">{message}</span> : null}
      </div>

      <div className="space-y-3">
        {metrics.map((metric) => (
          <div key={metric.id} className="rounded-2xl border border-white/8 bg-white/4 p-4">
            <p className="text-sm font-semibold text-white">{metric.metricLabel}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--color-lime)]">{metric.metricKey}</p>
            {metric.description ? <p className="mt-2 text-sm text-white/55">{metric.description}</p> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
