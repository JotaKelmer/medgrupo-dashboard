import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SyncRunRecord } from "@/lib/dashboard/types";

function variant(status: SyncRunRecord["status"]) {
  switch (status) {
    case "ok":
      return "good";
    case "warning":
      return "warning";
    case "running":
      return "info";
    case "error":
      return "replace";
    default:
      return "info";
  }
}

export function SyncRunsPanel({ syncRuns }: { syncRuns: SyncRunRecord[] }) {
  return (
    <Card className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-white/45">Controle</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Status das sincronizações</h2>
      </div>

      <div className="space-y-3">
        {syncRuns.map((run) => (
          <div key={run.id} className="rounded-2xl border border-white/8 bg-white/4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {run.platform === "meta" ? "Meta Ads" : "Google Ads"}
                </p>
                <p className="mt-1 text-sm text-white/55">
                  Última execução: {new Date(run.startedAt).toLocaleString("pt-BR")}
                </p>
                <p className="mt-1 text-sm text-white/55">
                  Registros inseridos: {run.insertedRows.toLocaleString("pt-BR")}
                </p>
                {run.errorMessage ? (
                  <p className="mt-2 text-sm text-white/70">{run.errorMessage}</p>
                ) : null}
              </div>
              <Badge variant={variant(run.status)}>{run.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
