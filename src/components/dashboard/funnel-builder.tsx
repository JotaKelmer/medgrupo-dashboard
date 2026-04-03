"use client";

import { useMemo, useState } from "react";
import { STANDARD_METRIC_OPTIONS } from "@/lib/dashboard/constants";
import type {
  CustomMetricDefinitionRecord,
  FunnelStepRecord,
} from "@/lib/dashboard/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type FunnelBuilderProps = {
  workspaceId: string;
  funnels: Array<{
    id: string;
    name: string;
    category: string | null;
    description: string | null;
    isDefault: boolean;
    steps: FunnelStepRecord[];
  }>;
  customMetrics: CustomMetricDefinitionRecord[];
};

type EditableStep = {
  id: string;
  stepLabel: string;
  sourceType: "standard" | "custom";
  metricSource: string;
};

type ValueChangeEvent = {
  target: {
    value: string;
  };
};

type CheckedChangeEvent = {
  target: {
    checked: boolean;
  };
};

function createDefaultStep(label = "Impressões"): EditableStep {
  return {
    id: crypto.randomUUID(),
    stepLabel: label,
    sourceType: "standard",
    metricSource: "impressions",
  };
}

export function FunnelBuilder({
  workspaceId,
  funnels,
  customMetrics,
}: FunnelBuilderProps) {
  const [selectedId, setSelectedId] = useState<string>(funnels[0]?.id ?? "new");
  const [message, setMessage] = useState("");

  const selected = useMemo(
    () => funnels.find((item) => item.id === selectedId),
    [funnels, selectedId]
  );

  const [name, setName] = useState(selected?.name ?? "");
  const [category, setCategory] = useState(selected?.category ?? "");
  const [description, setDescription] = useState(selected?.description ?? "");
  const [isDefault, setIsDefault] = useState(Boolean(selected?.isDefault));
  const [steps, setSteps] = useState<EditableStep[]>(
    selected?.steps.map((step) => ({
      id: step.id,
      stepLabel: step.stepLabel,
      sourceType: step.sourceType,
      metricSource: step.metricSource,
    })) ?? [createDefaultStep()]
  );

  function loadFunnel(funnelId: string) {
    const funnel = funnels.find((item) => item.id === funnelId);
    setSelectedId(funnelId);

    if (!funnel) {
      setName("");
      setCategory("");
      setDescription("");
      setIsDefault(false);
      setSteps([createDefaultStep()]);
      return;
    }

    setName(funnel.name);
    setCategory(funnel.category ?? "");
    setDescription(funnel.description ?? "");
    setIsDefault(Boolean(funnel.isDefault));
    setSteps(
      funnel.steps.map((step) => ({
        id: step.id,
        stepLabel: step.stepLabel,
        sourceType: step.sourceType,
        metricSource: step.metricSource,
      }))
    );
  }

  function updateStep(id: string, patch: Partial<EditableStep>) {
    setSteps((current) =>
      current.map((step) => (step.id === id ? { ...step, ...patch } : step))
    );
  }

  function moveStep(id: string, direction: -1 | 1) {
    setSteps((current) => {
      const index = current.findIndex((step) => step.id === id);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const copy = [...current];
      [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      return copy;
    });
  }

  async function save() {
    setMessage("");

    try {
      const response = await fetch("/api/funnels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedId !== "new" ? selectedId : undefined,
          workspaceId,
          name,
          category,
          description,
          isDefault,
          steps,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao salvar funil.");
      }

      setMessage("Funil salvo. Recarregue a página para ver a lista atualizada.");
    } catch (error) {
      console.error(error);
      setMessage("Não foi possível salvar no Supabase.");
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">
            Funis
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Builder de funil customizável
          </h2>
        </div>

        <div className="flex w-full flex-col gap-3 sm:max-w-[360px] sm:flex-row">
          <Select
            value={selectedId}
            onChange={(event: ValueChangeEvent) =>
              loadFunnel(event.target.value)
            }
          >
            <option value="new" className="bg-[var(--panel)] text-white">
              Novo funil
            </option>
            {funnels.map((funnel) => (
              <option
                key={funnel.id}
                value={funnel.id}
                className="bg-[var(--panel)] text-white"
              >
                {funnel.name}
              </option>
            ))}
          </Select>

          <Button className="whitespace-nowrap" onClick={() => loadFunnel("new")}>
            Novo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-white/45">
            Nome
          </label>
          <Input
            value={name}
            onChange={(event: ValueChangeEvent) => setName(event.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-white/45">
            Categoria
          </label>
          <Input
            value={category}
            onChange={(event: ValueChangeEvent) =>
              setCategory(event.target.value)
            }
          />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-white/45">
            Descrição
          </label>
          <Input
            value={description}
            onChange={(event: ValueChangeEvent) =>
              setDescription(event.target.value)
            }
          />
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm text-white/70">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(event: CheckedChangeEvent) =>
            setIsDefault(event.target.checked)
          }
        />
        Definir como funil padrão
      </label>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="grid gap-3 rounded-2xl border border-white/8 bg-white/4 p-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(160px,0.8fr)_minmax(220px,1fr)_auto]"
          >
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/45">
                Etapa
              </label>
              <Input
                value={step.stepLabel}
                onChange={(event: ValueChangeEvent) =>
                  updateStep(step.id, { stepLabel: event.target.value })
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/45">
                Fonte
              </label>
              <Select
                value={step.sourceType}
                onChange={(event: ValueChangeEvent) =>
                  updateStep(step.id, {
                    sourceType: event.target.value as "standard" | "custom",
                  })
                }
              >
                <option value="standard" className="bg-[var(--panel)] text-white">
                  Standard
                </option>
                <option value="custom" className="bg-[var(--panel)] text-white">
                  Custom
                </option>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.12em] text-white/45">
                metric_source
              </label>

              {step.sourceType === "standard" ? (
                <Select
                  value={step.metricSource}
                  onChange={(event: ValueChangeEvent) =>
                    updateStep(step.id, { metricSource: event.target.value })
                  }
                >
                  {STANDARD_METRIC_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="bg-[var(--panel)] text-white"
                    >
                      {option.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Select
                  value={step.metricSource}
                  onChange={(event: ValueChangeEvent) =>
                    updateStep(step.id, { metricSource: event.target.value })
                  }
                >
                  <option value="" className="bg-[var(--panel)] text-white">
                    Selecione uma métrica
                  </option>
                  {customMetrics.map((metric) => (
                    <option
                      key={metric.id}
                      value={metric.metricKey}
                      className="bg-[var(--panel)] text-white"
                    >
                      {metric.metricLabel}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            <div className="flex items-end gap-2">
              <Button
                className="px-3"
                onClick={() => moveStep(step.id, -1)}
                disabled={index === 0}
              >
                ↑
              </Button>

              <Button
                className="px-3"
                onClick={() => moveStep(step.id, 1)}
                disabled={index === steps.length - 1}
              >
                ↓
              </Button>

              <Button
                className="border-none bg-white/10 px-3 text-white"
                onClick={() =>
                  setSteps((current) =>
                    current.filter((item) => item.id !== step.id)
                  )
                }
              >
                ×
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          className="bg-white/10 text-white"
          onClick={() =>
            setSteps((current) => [
              ...current,
              createDefaultStep(`Etapa ${current.length + 1}`),
            ])
          }
        >
          Adicionar etapa
        </Button>

        <Button onClick={save}>Salvar funil</Button>

        {message ? (
          <span className="self-center text-sm text-white/60">{message}</span>
        ) : null}
      </div>
    </Card>
  );
}