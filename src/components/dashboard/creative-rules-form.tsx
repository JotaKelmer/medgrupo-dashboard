"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CreativeRuleRecord } from "@/lib/dashboard/types";

type NumberInputEvent = {
  target: {
    value: string | number;
  };
};

export function CreativeRulesForm({
  workspaceId,
  initialRules,
}: {
  workspaceId: string;
  initialRules: CreativeRuleRecord;
}) {
  const [rules, setRules] = useState(initialRules);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function update(field: keyof CreativeRuleRecord, value: number) {
    setRules((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function save() {
    setSaving(true);
    setMessage("");

    try {
      const { workspaceId: _workspaceId, ...rulesWithoutWorkspace } = rules;

      const response = await fetch("/api/creative-rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId,
          ...rulesWithoutWorkspace,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao salvar.");
      }

      setMessage("Régua de frequência salva.");
    } catch (error) {
      console.error(error);
      setMessage("Não foi possível salvar no Supabase.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-white/45">
          Criativos
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Régua de frequência
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field
          label="Boa até"
          value={rules.goodMax}
          onChange={(value) => update("goodMax", value)}
        />
        <Field
          label="Atenção até"
          value={rules.attentionMax}
          onChange={(value) => update("attentionMax", value)}
        />
        <Field
          label="Troca até"
          value={rules.replaceMax}
          onChange={(value) => update("replaceMax", value)}
        />
        <Field
          label="Crítico a partir de"
          value={rules.criticalMax}
          onChange={(value) => update("criticalMax", value)}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando..." : "Salvar régua"}
        </Button>
        {message ? (
          <span className="text-sm text-white/60">{message}</span>
        ) : null}
      </div>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-white/45">
        {label}
      </label>
      <Input
        type="number"
        value={value}
        onChange={(event: NumberInputEvent) =>
          onChange(Number(event.target.value || 0))
        }
      />
    </div>
  );
}