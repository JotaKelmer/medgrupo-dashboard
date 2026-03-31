import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AlertItem } from "@/lib/dashboard/types";

export function AlertsPanel({ alerts }: { alerts: AlertItem[] }) {
  const variantMap = {
    info: "info",
    warning: "warning",
    critical: "critical"
  } as const;

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-white/45">Alertas</p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          O que exige ação agora
        </h2>
      </div>

      <div className="space-y-3">
        {alerts.length ? (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-2xl border border-white/8 bg-white/4 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{alert.title}</p>
                  <p className="mt-1 text-sm leading-6 text-white/60">
                    {alert.description}
                  </p>
                </div>

                <Badge variant={variantMap[alert.severity]}>{alert.severity}</Badge>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
            <p className="text-sm text-white/60">
              Nenhum alerta crítico para o período selecionado.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
