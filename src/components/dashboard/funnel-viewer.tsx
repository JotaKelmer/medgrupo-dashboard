import { Card } from "@/components/ui/card";
import type { FunnelResult } from "@/lib/dashboard/types";
import { formatNumber, formatPercent } from "@/lib/dashboard/utils";

const tones = [
  "linear-gradient(135deg, rgba(217,235,26,0.3), rgba(217,235,26,0.14))",
  "linear-gradient(135deg, rgba(72,150,150,0.28), rgba(72,150,150,0.12))",
  "linear-gradient(135deg, rgba(142,26,235,0.28), rgba(142,26,235,0.12))",
  "linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))",
  "linear-gradient(135deg, rgba(217,235,26,0.18), rgba(72,150,150,0.12))"
];

function widthPercentage(value: number, maxValue: number) {
  if (maxValue <= 0) {
    return 100;
  }

  return Math.max(38, Math.round((value / maxValue) * 100));
}

export function FunnelViewer({ funnel }: { funnel: FunnelResult | null }) {
  if (!funnel) {
    return (
      <Card>
        <p className="text-sm text-white/60">
          Nenhum funil configurado para essa conta.
        </p>
      </Card>
    );
  }

  const maxValue = Math.max(...funnel.steps.map((step) => step.value), 1);

  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">
            Funil customizável
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">{funnel.name}</h2>
        </div>

        <p className="max-w-md text-sm leading-6 text-white/55">
          A largura de cada estágio acompanha o volume da etapa. A queda visual
          ajuda a localizar rapidamente os maiores gargalos.
        </p>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-white/8 bg-white/3 p-3 sm:p-4">
        {funnel.steps.map((step, index) => {
          const currentWidth = widthPercentage(step.value, maxValue);
          const nextValue = funnel.steps[index + 1]?.value ?? step.value;
          const nextWidth = widthPercentage(nextValue, maxValue);
          const topInset = (100 - currentWidth) / 2;
          const bottomInset = (100 - nextWidth) / 2;

          return (
            <div
              key={step.id}
              className="relative isolate flex min-h-[110px] items-center justify-center px-1 py-2 sm:min-h-[118px]"
            >
              <div className="absolute inset-0 flex justify-center">
                <div
                  className="h-full w-full rounded-3xl border border-white/8 shadow-[0_18px_48px_rgba(0,0,0,0.18)]"
                  style={{
                    clipPath: `polygon(${topInset}% 0%, ${100 - topInset}% 0%, ${100 - bottomInset}% 100%, ${bottomInset}% 100%)`,
                    background: tones[index % tones.length]
                  }}
                />
              </div>

              <div className="relative z-10 flex w-full max-w-[780px] flex-col gap-3 px-5 py-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                    {index === 0 ? "Entrada" : `Etapa ${index + 1}`}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">
                    {step.label}
                  </h3>
                </div>

                <div className="flex flex-col items-center gap-2 sm:items-end">
                  <p className="text-3xl font-semibold text-white">
                    {formatNumber(step.value)}
                  </p>

                  {index > 0 && step.rateFromPrevious !== null ? (
                    <span className="inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-[var(--color-teal)]">
                      Conversão {formatPercent(step.rateFromPrevious)}
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/55">
                      Base do funil
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
