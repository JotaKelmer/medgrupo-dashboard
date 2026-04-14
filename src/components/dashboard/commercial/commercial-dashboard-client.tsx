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
  buildLeaderboardBuckets,
} from "@/lib/commercial/calculations";
import type { CommercialOverviewData } from "@/lib/commercial/types";

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
  const [focusedSellerId, setFocusedSellerId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

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

  const summary = useMemo(
    () => buildCommercialSummary(filteredRows),
    [filteredRows],
  );

  const previousSummary = useMemo(
    () => buildCommercialSummary(previousFilteredRows),
    [previousFilteredRows],
  );

  const leaderboard = useMemo(
    () => buildLeaderboardBuckets(filteredRows),
    [filteredRows],
  );

  const selectedSeller = useMemo(() => {
    if (!filteredRows.length) return null;
    if (focusedSellerId) {
      return filteredRows.find((row) => row.ownerId === focusedSellerId) ?? null;
    }
    if (safeOwnerId !== "all") {
      return filteredRows[0] ?? null;
    }
    return null;
  }, [filteredRows, focusedSellerId, safeOwnerId]);

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
    setFocusedSellerId(null);
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
        body: JSON.stringify({ startDate, endDate }),
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

            {initialData.canEdit ? (
              <Button
                type="button"
                onClick={handleSync}
                disabled={isSyncing || initialData.isMock}
                className="border border-[var(--color-lime)]/25 bg-[var(--color-lime)] text-[var(--color-bg)]"
              >
                {isSyncing ? "Sincronizando..." : "Sincronizar CRM"}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="border-t border-white/8 bg-white/[0.02] px-5 py-4 sm:px-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]">
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
                  <option value="all">Visão geral</option>
                ) : null}
                {sellerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="button" className="w-full" onClick={applyFilters}>
                Aplicar filtros
              </Button>
            </div>
          </div>

          {syncMessage ? (
            <p className="mt-3 text-sm text-white/65">{syncMessage}</p>
          ) : null}
        </div>
      </Card>

      <CommercialKpis summary={summary} previousSummary={previousSummary} />

      {safeOwnerId === "all" ? <CommercialPodium rows={aggregated} /> : null}

      <CommercialRankingTable
        rows={filteredRows}
        selectedOwnerId={safeOwnerId}
        onOpenFeedback={(row) => setFocusedSellerId(row.ownerId)}
      />

      {selectedSeller ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
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
          />
        </div>
      ) : null}

      {safeOwnerId === "all" ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
              Top 20%
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">Grupo A</h3>
            <div className="mt-4 space-y-2 text-sm text-white/70">
              {leaderboard.topA.length ? (
                leaderboard.topA.map((row) => (
                  <div
                    key={row.ownerId}
                    className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/3 px-3 py-2"
                  >
                    <span>{row.ownerName}</span>
                    <span className="text-[var(--color-lime)]">{row.score}</span>
                  </div>
                ))
              ) : (
                <p>Sem registros.</p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
              Faixa principal
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              Miolo da operação
            </h3>
            <p className="mt-4 text-sm leading-6 text-white/65">
              {leaderboard.middle70.length
                ? `${leaderboard.middle70.length} vendedor(es) compõem a faixa central do ranking neste recorte.`
                : "Com poucos vendedores no período, a maior parte ficou concentrada nas faixas extremas."}
            </p>
          </Card>

          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
              Bottom 10%
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              Pontos de atenção
            </h3>
            <div className="mt-4 space-y-2 text-sm text-white/70">
              {leaderboard.bottomC.length ? (
                leaderboard.bottomC.map((row) => (
                  <div
                    key={row.ownerId}
                    className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/3 px-3 py-2"
                  >
                    <span>{row.ownerName}</span>
                    <span className="text-white/55">{row.score}</span>
                  </div>
                ))
              ) : (
                <p>Sem registros.</p>
              )}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}