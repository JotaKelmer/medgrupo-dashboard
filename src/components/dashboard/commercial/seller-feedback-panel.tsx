"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  CommercialAggregatedMetric,
  CommercialFeedbackRecord,
} from "@/lib/commercial/types";
import {
  buildSuggestedFeedback,
  formatDateTime,
  formatPercent,
} from "@/lib/commercial/utils";

function formatPeriodDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function HeaderIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/90">
      {children}
    </span>
  );
}

function BubbleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M7 18.5H5a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 5 4.5h14A1.5 1.5 0 0 1 20.5 6v11a1.5 1.5 0 0 1-1.5 1.5H12l-4 3z" />
    </svg>
  );
}

function BotBadge() {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-lime)]/10 font-bold text-[var(--color-lime)]">
      AI
    </span>
  );
}

function CloseIcon() {
  return <span className="text-2xl leading-none">×</span>;
}

function AnalysisBox({
  canEdit,
  suggestedFeedback,
  isGenerating,
  onGenerate,
}: {
  canEdit: boolean;
  suggestedFeedback: string;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-lime)]/20 bg-[#121616] p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 font-bold text-[var(--color-lime)]">
          <BotBadge />
          <h3>Análise do Diretor (IA)</h3>
        </div>

        {canEdit ? (
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-[#121616] transition-colors hover:bg-white/80 disabled:bg-white/50"
          >
            {isGenerating ? "Gerando..." : "Gerar"}
          </button>
        ) : null}
      </div>

      {suggestedFeedback ? (
        <div className="whitespace-pre-wrap rounded-lg border border-[var(--color-lime)]/20 bg-[#121616]/50 p-4 text-sm leading-relaxed text-white/90">
          {suggestedFeedback}
        </div>
      ) : (
        <p className="py-4 text-center text-sm italic text-white/70">
          {canEdit
            ? 'Nenhuma análise gerada ainda. Clique no botão acima para gerar.'
            : "Nenhuma análise gerada."}
        </p>
      )}
    </div>
  );
}

function ManualBox({
  canEdit,
  manualFeedback,
  onChange,
  onSave,
  isSaving,
  canSave,
  compactFooter = false,
}: {
  canEdit: boolean;
  manualFeedback: string;
  onChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  canSave: boolean;
  compactFooter?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-lime)]/20 bg-[#121616]/50 p-5">
      <div className="mb-4 flex items-center gap-2 font-bold text-white/90">
        <HeaderIcon>
          <BubbleIcon />
        </HeaderIcon>
        <h3>Registro de Feedback Manual</h3>
      </div>

      <textarea
        value={manualFeedback}
        onChange={(event) => onChange(event.target.value)}
        disabled={!canEdit}
        placeholder={
          canEdit
            ? "Escreva aqui os combinados, pontos de atenção e feedbacks passados para o vendedor..."
            : "Nenhum feedback manual registrado."
        }
        className="h-32 w-full resize-none rounded-xl border border-[var(--color-lime)]/20 bg-[#121616] p-4 text-sm text-white outline-none transition focus:border-[var(--color-lime)] disabled:opacity-70"
      />

      {canEdit && !compactFooter ? (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || !canSave}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-lime)] px-4 py-2 text-sm font-bold text-[#121616] transition-colors hover:bg-[var(--color-lime)]/80 disabled:bg-[#121616]/80 disabled:text-white/70"
          >
            {isSaving ? "Salvando..." : "Salvar Feedback"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function HistoryList({
  feedbacks,
  isLoading,
}: {
  feedbacks: CommercialFeedbackRecord[];
  isLoading: boolean;
}) {
  return (
    <div className="mt-8 border-t border-[var(--color-lime)]/20 pt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <HeaderIcon>
            <BubbleIcon />
          </HeaderIcon>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
              Histórico
            </p>
            <h4 className="mt-1 text-base font-semibold text-white">
              Últimos feedbacks
            </h4>
          </div>
        </div>

        {isLoading ? (
          <span className="text-xs text-white/45">Carregando...</span>
        ) : null}
      </div>

      <div className="space-y-3">
        {feedbacks.length ? (
          feedbacks.map((feedback) => (
            <div
              key={feedback.id}
              className="rounded-xl border border-[var(--color-lime)]/20 bg-[#121616]/50 p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
                <span>
                  {formatPeriodDate(feedback.periodStart)} →{" "}
                  {formatPeriodDate(feedback.periodEnd)}
                </span>
                <span>•</span>
                <span>{formatDateTime(feedback.updatedAt)}</span>
                {feedback.authorName ? (
                  <>
                    <span>•</span>
                    <span>{feedback.authorName}</span>
                  </>
                ) : null}
              </div>

              {feedback.aiFeedback ? (
                <div className="mt-3">
                  <div className="mb-1 flex items-center gap-1.5 text-white/90">
                    <span className="font-bold text-[var(--color-lime)]">IA</span>
                  </div>
                  <p className="text-sm italic leading-6 text-white/90">
                    "{feedback.aiFeedback}"
                  </p>
                </div>
              ) : null}

              {feedback.manualFeedback ? (
                <div className="mt-3">
                  <div className="mb-1 flex items-center gap-1.5 text-white/90">
                    <span className="font-bold text-[var(--color-lime)]">
                      Gestor
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-white">
                    {feedback.manualFeedback}
                  </p>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-[var(--color-lime)]/20 bg-[#121616]/50 p-4 text-sm text-white/50">
            Nenhum feedback registrado para este vendedor.
          </div>
        )}
      </div>
    </div>
  );
}

export function SellerFeedbackPanel({
  selectedSeller,
  filters,
  canEdit,
  feedbackEnabled,
  mode = "panel",
  onClose,
  onSaved,
  refreshToken = 0,
}: {
  selectedSeller: CommercialAggregatedMetric;
  filters: { startDate: string; endDate: string };
  canEdit: boolean;
  feedbackEnabled: boolean;
  mode?: "panel" | "modal";
  onClose?: () => void;
  onSaved?: () => void;
  refreshToken?: number;
}) {
  const [feedbacks, setFeedbacks] = useState<CommercialFeedbackRecord[]>([]);
  const [manualFeedback, setManualFeedback] = useState("");
  const [suggestedFeedback, setSuggestedFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const latestForPeriod = useMemo(() => {
    return (
      feedbacks.find(
        (item) =>
          item.periodStart === filters.startDate &&
          item.periodEnd === filters.endDate,
      ) ?? null
    );
  }, [feedbacks, filters.endDate, filters.startDate]);

  useEffect(() => {
    let cancelled = false;

    async function loadFeedbacks() {
      if (!feedbackEnabled) {
        setFeedbacks([]);
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/commercial/feedbacks?ownerId=${encodeURIComponent(
            selectedSeller.ownerId,
          )}`,
          { cache: "no-store" },
        );

        const payload = (await response.json()) as {
          error?: string;
          feedbacks?: CommercialFeedbackRecord[];
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Falha ao carregar feedbacks.");
        }

        if (!cancelled) {
          setFeedbacks(payload.feedbacks ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Falha ao carregar feedbacks.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadFeedbacks();

    return () => {
      cancelled = true;
    };
  }, [feedbackEnabled, refreshToken, selectedSeller.ownerId]);

  useEffect(() => {
    setManualFeedback(latestForPeriod?.manualFeedback ?? "");
    setSuggestedFeedback(latestForPeriod?.aiFeedback ?? "");
    setMessage(null);
  }, [latestForPeriod, selectedSeller.ownerId]);

  function handleGenerateSuggestion() {
    setIsGenerating(true);

    const suggestion = buildSuggestedFeedback({
      ownerName: selectedSeller.ownerName,
      coveragePercent: selectedSeller.coveragePercent,
      stagnantPercent: selectedSeller.stagnantPercent,
      activitiesDoneYesterday: selectedSeller.activitiesDoneYesterday,
      activitiesOverdue: selectedSeller.activitiesOverdue,
      dealsAdvancedYesterday: selectedSeller.dealsAdvancedYesterday,
      dealsWonYesterday: selectedSeller.dealsWonYesterday,
      dealsLostYesterday: selectedSeller.dealsLostYesterday,
    });

    setSuggestedFeedback(suggestion);
    setMessage("Análise gerada com base nas métricas do período.");
    setIsGenerating(false);
  }

  async function handleSave() {
    if (!canEdit || !feedbackEnabled) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/commercial/feedbacks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ownerId: selectedSeller.ownerId,
          ownerName: selectedSeller.ownerName,
          periodStart: filters.startDate,
          periodEnd: filters.endDate,
          aiFeedback: suggestedFeedback,
          manualFeedback,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        feedback?: CommercialFeedbackRecord;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao salvar feedback.");
      }

      const saved = payload.feedback;

      if (saved) {
        setFeedbacks((current) => {
          const filtered = current.filter(
            (item) =>
              !(
                item.periodStart === saved.periodStart &&
                item.periodEnd === saved.periodEnd
              ),
          );
          return [saved, ...filtered];
        });
      }

      setMessage("Feedback salvo com sucesso.");
      onSaved?.();

      if (mode === "modal") {
        onClose?.();
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao salvar feedback.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const canSave = Boolean(manualFeedback || suggestedFeedback);
  const periodLabel = `${formatPeriodDate(filters.startDate)} a ${formatPeriodDate(
    filters.endDate,
  )}`;

  if (mode === "modal") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
        <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--color-lime)]/20 bg-[#121616] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--color-lime)]/20 bg-[#121616]/50 p-6">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                <HeaderIcon>
                  <BubbleIcon />
                </HeaderIcon>
                Feedback: {selectedSeller.ownerName}
              </h2>
              <p className="mt-1 text-sm text-white/70">Período: {periodLabel}</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/70 transition-colors hover:bg-[#121616]/80 hover:text-white"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <AnalysisBox
              canEdit={canEdit && feedbackEnabled}
              suggestedFeedback={suggestedFeedback}
              isGenerating={isGenerating}
              onGenerate={handleGenerateSuggestion}
            />

            <ManualBox
              canEdit={canEdit && feedbackEnabled}
              manualFeedback={manualFeedback}
              onChange={setManualFeedback}
              onSave={handleSave}
              isSaving={isSaving}
              canSave={canSave}
              compactFooter
            />

            {message ? (
              <p className="text-sm text-white/65">{message}</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 border-t border-[var(--color-lime)]/20 bg-[#121616]/30 p-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:text-white"
            >
              {canEdit ? "Cancelar" : "Fechar"}
            </button>

            {canEdit ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !feedbackEnabled || !canSave}
                className="rounded-lg bg-[var(--color-lime)] px-6 py-2 text-sm font-bold text-[#121616] shadow-lg shadow-[var(--color-lime)]/20 transition-colors hover:bg-[var(--color-lime)]/80 disabled:bg-[var(--color-lime)]/50"
              >
                {isSaving ? "Salvando..." : "Salvar Feedback"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <HeaderIcon>
            <BubbleIcon />
          </HeaderIcon>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
              Análise e Feedback
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">
              {selectedSeller.ownerName}
            </h3>
            <p className="mt-1 text-sm text-white/60">Período: {periodLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={feedbackEnabled ? "good" : "warning"}>
            {feedbackEnabled ? "Persistência ativa" : "Mock / leitura"}
          </Badge>
          <Badge variant="info">
            Cobertura {formatPercent(selectedSeller.coveragePercent)} · Saúde{" "}
            {formatPercent(1 - selectedSeller.stagnantPercent)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AnalysisBox
          canEdit={canEdit && feedbackEnabled}
          suggestedFeedback={suggestedFeedback}
          isGenerating={isGenerating}
          onGenerate={handleGenerateSuggestion}
        />

        <ManualBox
          canEdit={canEdit && feedbackEnabled}
          manualFeedback={manualFeedback}
          onChange={setManualFeedback}
          onSave={handleSave}
          isSaving={isSaving}
          canSave={canSave}
        />
      </div>

      {message ? <p className="mt-4 text-sm text-white/65">{message}</p> : null}

      <HistoryList feedbacks={feedbacks} isLoading={isLoading} />
    </Card>
  );
}