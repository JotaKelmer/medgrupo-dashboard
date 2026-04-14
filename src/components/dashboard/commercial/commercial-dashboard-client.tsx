"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CommercialCharts } from "@/components/dashboard/commercial/commercial-charts";
import { CommercialKpis } from "@/components/dashboard/commercial/commercial-kpis";
import { CommercialPodium } from "@/components/dashboard/commercial/commercial-podium";
import { CommercialRankingTable } from "@/components/dashboard/commercial/commercial-ranking-table";
import { SellerFeedbackPanel } from "@/components/dashboard/commercial/seller-feedback-panel";
import {
  aggregateCommercialMetrics,
  buildCommercialSummary,
  buildCommercialWeeklyPerformance,
} from "@/lib/commercial/calculations";
import type {
  CommercialAggregatedMetric,
  CommercialOverviewData,
} from "@/lib/commercial/types";
import { formatNumber } from "@/lib/commercial/utils";

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

function buildPrintHtml(params: {
  title: string;
  startDate: string;
  endDate: string;
  rows: CommercialAggregatedMetric[];
}) {
  const { title, startDate, endDate, rows } = params;
  const summary = buildCommercialSummary(rows);

  const tableRows = rows
    .map((row, index) => {
      const totalClosed = row.dealsWonYesterday + row.dealsLostYesterday;
      const conversion =
        totalClosed > 0 ? (row.dealsWonYesterday / totalClosed) * 100 : 0;

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${row.ownerName}</td>
          <td>${formatNumber(row.score)}</td>
          <td>${formatNumber(row.totalOpenDeals)}</td>
          <td>${(row.coveragePercent * 100).toFixed(1)}%</td>
          <td>${formatNumber(row.activitiesDoneYesterday)}</td>
          <td>${formatNumber(row.dealsAdvancedYesterday)}</td>
          <td>${formatNumber(row.dealsWonYesterday)}</td>
          <td>${formatNumber(row.dealsLostYesterday)}</td>
          <td>${((1 - row.stagnantPercent) * 100).toFixed(1)}% / ${conversion.toFixed(0)}%</td>
        </tr>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatório Comercial</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 32px;
            color: #111827;
          }
          h1 {
            margin: 0 0 8px;
            font-size: 28px;
          }
          .muted {
            color: #4b5563;
            margin-bottom: 24px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 24px;
          }
          .card {
            border: 1px solid #d1d5db;
            border-radius: 12px;
            padding: 16px;
          }
          .card strong {
            display: block;
            font-size: 12px;
            color: #4b5563;
            text-transform: uppercase;
            margin-bottom: 6px;
          }
          .card span {
            font-size: 24px;
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
          }
          th, td {
            border: 1px solid #d1d5db;
            padding: 10px;
            text-align: left;
            font-size: 13px;
          }
          th {
            background: #f3f4f6;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="muted">
          Período: ${formatPeriodDate(startDate)} a ${formatPeriodDate(endDate)}
        </div>

        <div class="grid">
          <div class="card">
            <strong>Cobertura</strong>
            <span>${(summary.coverage * 100).toFixed(0)}%</span>
          </div>
          <div class="card">
            <strong>Atividades</strong>
            <span>${formatNumber(summary.activities)}</span>
          </div>
          <div class="card">
            <strong>Avanços</strong>
            <span>${formatNumber(summary.advances)}</span>
          </div>
          <div class="card">
            <strong>Qualidade</strong>
            <span>${(summary.quality * 100).toFixed(0)}%</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Pos</th>
              <th>Vendedor</th>
              <th>Pontuação</th>
              <th>Negócios</th>
              <th>Cobertura</th>
              <th>Atividades</th>
              <th>Avanços</th>
              <th>Ganhos</th>
              <th>Perdas</th>
              <th>Qualidade / Conversão</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `;
}

export function CommercialDashboardClient({
  initialData,
}: {
  initialData: CommercialOverviewData;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [startDate, setStartDate] = useState(initialData.filters.startDate);
  const [endDate, setEndDate] = useState(initialData.filters.endDate);
  const [ownerId, setOwnerId] = useState(initialData.filters.ownerId);
  const [selectedFeedbackSeller, setSelectedFeedbackSeller] =
    useState<CommercialAggregatedMetric | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [feedbackRefreshToken, setFeedbackRefreshToken] = useState(0);

  const sellerOptions = useMemo(() => {
    if (initialData.role !== "viewer" || !initialData.viewerEmail) {
      return initialData.sellerOptions;
    }

    return initialData.sellerOptions.filter(
      (option) =>
        option.email?.toLowerCase() === initialData.viewerEmail?.toLowerCase(),
    );
  }, [initialData.role, initialData.sellerOptions, initialData.viewerEmail]);

  const safeOwnerId = useMemo(() => {
    if (initialData.role === "viewer") {
      return sellerOptions[0]?.value ?? ownerId;
    }

    return ownerId;
  }, [initialData.role, ownerId, sellerOptions]);

  const aggregated = useMemo(
    () => aggregateCommercialMetrics(initialData.metrics),
    [initialData.metrics],
  );

  const previousAggregated = useMemo(
    () => aggregateCommercialMetrics(initialData.previousMetrics),
    [initialData.previousMetrics],
  );

  const filteredRows = useMemo(() => {
    if (safeOwnerId === "all") return aggregated;
    return aggregated.filter((row) => row.ownerId === safeOwnerId);
  }, [aggregated, safeOwnerId]);

  const previousFilteredRows = useMemo(() => {
    if (safeOwnerId === "all") return previousAggregated;
    return previousAggregated.filter((row) => row.ownerId === safeOwnerId);
  }, [previousAggregated, safeOwnerId]);

  const selectedSeller = useMemo(() => {
    if (safeOwnerId === "all") return null;
    return filteredRows[0] ?? null;
  }, [filteredRows, safeOwnerId]);

  const weeklyPoints = useMemo(
    () =>
      buildCommercialWeeklyPerformance(
        initialData.metrics,
        selectedSeller?.ownerId ?? null,
      ),
    [initialData.metrics, selectedSeller?.ownerId],
  );

  function applyFilters() {
    const params = new URLSearchParams();
    params.set("startDate", startDate);
    params.set("endDate", endDate);

    if (safeOwnerId) {
      params.set(
        "ownerId",
        initialData.role === "viewer"
          ? sellerOptions[0]?.value ?? safeOwnerId
          : safeOwnerId,
      );
    }

    setSelectedFeedbackSeller(null);
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleStartDateChange(event: ChangeEvent<HTMLInputElement>) {
    setStartDate(event.target.value);
  }

  function handleEndDateChange(event: ChangeEvent<HTMLInputElement>) {
    setEndDate(event.target.value);
  }

  function handleOwnerChange(event: ChangeEvent<HTMLSelectElement>) {
    setOwnerId(event.target.value);
    setSelectedFeedbackSeller(null);
  }

  async function handleSync() {
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const response = await fetch("/api/commercial/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: initialData.filters.startDate,
          endDate: initialData.filters.endDate,
        }),
      });

      const payload = (await response.json()) as {
        inserted?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao sincronizar CRM.");
      }

      setSyncMessage(`${payload.inserted ?? 0} linha(s) atualizadas no período.`);
      router.refresh();
    } catch (error) {
      setSyncMessage(
        error instanceof Error ? error.message : "Erro ao sincronizar CRM.",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  function handlePrint() {
    if (typeof window === "undefined") return;

    const title =
      safeOwnerId === "all"
        ? "Relatório de Performance do Time"
        : `Relatório de Performance de ${selectedSeller?.ownerName ?? "Vendedor"}`;

    const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");

    if (!popup) {
      window.print();
      return;
    }

    popup.document.open();
    popup.document.write(
      buildPrintHtml({
        title,
        startDate: initialData.filters.startDate,
        endDate: initialData.filters.endDate,
        rows: filteredRows,
      }),
    );
    popup.document.close();

    popup.onload = () => {
      popup.focus();
      popup.print();
      popup.close();
    };
  }

  const canManageUsers =
    initialData.role === "owner" || initialData.role === "admin";
  const feedbackEnabled = !initialData.isMock;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-5 p-5 sm:p-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.22em] text-white/45">
              Excelência Comercial
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              Ranking e acompanhamento do time comercial
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/58">
              A antiga aba externa foi internalizada no Dash. Agora o Comercial
              segue o mesmo login, permissões e padrão visual do restante da
              plataforma.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant={initialData.isMock ? "warning" : "good"}>
                {initialData.isMock ? "Modo demonstração" : "Dados internos"}
              </Badge>
              <Badge variant="info">Permissão: {initialData.role}</Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManageUsers ? (
              <Link href="/dashboard/usuarios">
                <Button
                  type="button"
                  className="border border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  Gerenciar acessos
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="border-t border-white/8 bg-white/[0.02] px-5 py-4 sm:px-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto_auto]">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/45">
                Início
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/45">
                Fim
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/45">
                Vendedor
              </label>
              <Select
                value={
                  initialData.role === "viewer"
                    ? sellerOptions[0]?.value ?? "all"
                    : ownerId
                }
                onChange={handleOwnerChange}
                disabled={initialData.role === "viewer"}
              >
                {initialData.role !== "viewer" ? (
                  <option value="all">Visão Geral (Todos)</option>
                ) : null}
                {sellerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-end">
              <Button type="button" className="w-full" onClick={handlePrint}>
                Imprimir PDF
              </Button>
            </div>

            <div className="flex items-end">
              {initialData.canEdit ? (
                <Button
                  type="button"
                  onClick={handleSync}
                  disabled={isSyncing || initialData.isMock}
                  className="w-full border border-[var(--color-lime)]/25 bg-[var(--color-lime)] text-[var(--color-bg)]"
                >
                  {isSyncing ? "Atualizando..." : "Atualizar Dados"}
                </Button>
              ) : (
                <Button type="button" className="w-full" onClick={applyFilters}>
                  Aplicar filtros
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <Button type="button" className="min-w-[180px]" onClick={applyFilters}>
              Aplicar filtros
            </Button>
          </div>

          {syncMessage ? (
            <p className="mt-3 text-sm text-white/65">{syncMessage}</p>
          ) : null}
        </div>
      </Card>

      <CommercialKpis
        rows={filteredRows}
        previousRows={previousFilteredRows}
        teamRows={aggregated}
        selectedOwnerId={safeOwnerId}
      />

      {safeOwnerId === "all" ? <CommercialPodium rows={aggregated} /> : null}

      <CommercialRankingTable
        rows={filteredRows}
        selectedOwnerId={safeOwnerId}
        onOpenFeedback={(row) => setSelectedFeedbackSeller(row)}
      />

      {selectedSeller ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <CommercialCharts
            points={weeklyPoints}
            sellerName={selectedSeller.ownerName}
          />
          <SellerFeedbackPanel
            selectedSeller={selectedSeller}
            filters={{
              startDate: initialData.filters.startDate,
              endDate: initialData.filters.endDate,
            }}
            canEdit={initialData.canEdit}
            feedbackEnabled={feedbackEnabled}
            refreshToken={feedbackRefreshToken}
            onSaved={() => setFeedbackRefreshToken((value) => value + 1)}
          />
        </div>
      ) : null}

      {selectedFeedbackSeller ? (
        <SellerFeedbackPanel
          mode="modal"
          selectedSeller={selectedFeedbackSeller}
          filters={{
            startDate: initialData.filters.startDate,
            endDate: initialData.filters.endDate,
          }}
          canEdit={initialData.canEdit}
          feedbackEnabled={feedbackEnabled}
          refreshToken={feedbackRefreshToken}
          onSaved={() => setFeedbackRefreshToken((value) => value + 1)}
          onClose={() => setSelectedFeedbackSeller(null)}
        />
      ) : null}
    </div>
  );
}