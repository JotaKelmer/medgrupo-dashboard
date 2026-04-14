"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  CommercialAggregatedMetric,
  CommercialFeedbackRecord,
} from "@/lib/commercial/types";
import { buildSuggestedFeedback, formatDateTime, formatPercent } from "@/lib/commercial/utils";

export function SellerFeedbackPanel({
  selectedSeller,
  filters,
  canEdit,
  feedbackEnabled,
}: {
  selectedSeller: CommercialAggregatedMetric;
  filters: { startDate: string; endDate: string };
  canEdit: boolean;
  feedbackEnabled: boolean;
}) {
  const [feedbacks, setFeedbacks] = useState<CommercialFeedbackRecord[]>([]);
  const [manualFeedback, setManualFeedback] = useState("");
  const [suggestedFeedback, setSuggestedFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
      setMessage(null);

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
  }, [feedbackEnabled, selectedSeller.ownerId]);

  useEffect(() => {
    setManualFeedback(latestForPeriod?.manualFeedback ?? "");
    setSuggestedFeedback(latestForPeriod?.aiFeedback ?? "");
  }, [latestForPeriod, selectedSeller.ownerId]);

  function handleGenerateSuggestion() {
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
    setMessage("Rascunho gerado com base nas métricas do período.");
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
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao salvar feedback.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">
            Feedback do vendedor
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">
            {selectedSeller.ownerName}
          </h3>
          <p className="mt-2 text-sm text-white/60">
            Cobertura {formatPercent(selectedSeller.coveragePercent)} · Saúde{" "}
            {formatPercent(1 - selectedSeller.stagnantPercent)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={feedbackEnabled ? "good" : "warning"}>
            {feedbackEnabled ? "Persistência ativa" : "Mock / leitura"}
          </Badge>
          <Badge variant="info">Período atual</Badge>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-white/45">
            Rascunho sugerido
          </label>
          <div className="rounded-3xl border border-white/10 bg-white/4 p-4 text-sm leading-6 text-white/75">
            {suggestedFeedback || "Nenhum rascunho gerado para o período."}
          </div>
          {canEdit ? (
            <div className="mt-3">
              <Button
                type="button"
                onClick={handleGenerateSuggestion}
                className="border border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                Gerar rascunho
              </Button>
            </div>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-white/45">
            Observações do gestor
          </label>
          <textarea
            value={manualFeedback}
            onChange={(event) => setManualFeedback(event.target.value)}
            disabled={!canEdit}
            rows={6}
            className="w-full rounded-3xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[var(--color-lime)]/45 disabled:cursor-not-allowed disabled:opacity-70"
            placeholder="Registre combinados, pontos de atenção e próximos passos."
          />
        </div>

        {message ? <p className="text-sm text-white/65">{message}</p> : null}

        {canEdit ? (
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !feedbackEnabled}
            className="border border-[var(--color-lime)]/25 bg-[var(--color-lime)] text-[var(--color-bg)]"
          >
            {isSaving ? "Salvando..." : "Salvar feedback"}
          </Button>
        ) : null}
      </div>

      <div className="mt-8 border-t border-white/8 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
              Histórico
            </p>
            <h4 className="mt-1 text-base font-semibold text-white">
              Últimos feedbacks
            </h4>
          </div>
          {isLoading ? (
            <span className="text-xs text-white/45">Carregando...</span>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          {feedbacks.length ? (
            feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="rounded-3xl border border-white/8 bg-white/[0.03] p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
                  <span>
                    {feedback.periodStart} → {feedback.periodEnd}
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
                  <p className="mt-3 text-sm leading-6 text-white/75">
                    <strong className="font-medium text-white">Rascunho:</strong>{" "}
                    {feedback.aiFeedback}
                  </p>
                ) : null}

                {feedback.manualFeedback ? (
                  <p className="mt-3 text-sm leading-6 text-white/75">
                    <strong className="font-medium text-white">Gestor:</strong>{" "}
                    {feedback.manualFeedback}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 text-sm text-white/50">
              Nenhum feedback registrado para este vendedor.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
