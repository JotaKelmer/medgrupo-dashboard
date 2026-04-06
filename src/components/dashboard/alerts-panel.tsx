import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AlertItem } from "@/lib/dashboard/types";

const variantMap = {
  info: "info",
  warning: "warning",
  critical: "critical",
} as const;

const severityLabelMap = {
  info: "Informação",
  warning: "Aviso",
  critical: "Crítico",
} as const;

function translateAlertText(text: string) {
  return text
    .replace(/\bwarning\b/gi, "Aviso")
    .replace(/\bcritical\b/gi, "Crítico")
    .replace(/\binfo\b/gi, "Informação")
    .replace(/\breplace\b/gi, "Trocar")
    .replace(/\bgood\b/gi, "Saudável")
    .replace(/\bsync\b/gi, "sincronização")
    .replace(/\bfatigue\b/gi, "fadiga")
    .replace(/\bcreative\b/gi, "criativo");
}

export function AlertsPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <Card className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-white/45">Alertas</p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          O que exige ação agora
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/58">
          Terminologia visível padronizada em português para leitura rápida da operação.
        </p>
      </div>

      <div className="space-y-3">
        {alerts.length ? (
          alerts.map((alert) => {
            const severity = (alert.severity ?? "info") as keyof typeof severityLabelMap;

            return (
              <div
                key={alert.id}
                className="rounded-2xl border border-white/8 bg-white/4 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {translateAlertText(alert.title)}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-white/60">
                      {translateAlertText(alert.description)}
                    </p>
                  </div>

                  <Badge variant={variantMap[severity]}>{severityLabelMap[severity]}</Badge>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
            <p className="text-sm text-white/60">
              Nenhum alerta relevante para o período selecionado.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
