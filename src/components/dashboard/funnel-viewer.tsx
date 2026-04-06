import { Card } from "@/components/ui/card";
import type { KpiMetrics } from "@/lib/dashboard/types";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  safeDivide,
} from "@/lib/dashboard/utils";

type Props = {
  kpis: KpiMetrics;
};

type FunnelStep = {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  badge?: string | null;
};

const STEP_TONES = [
  "linear-gradient(180deg, #e6eef9 0%, #d7e3f4 100%)",
  "linear-gradient(180deg, #d3e1f6 0%, #c1d5f0 100%)",
  "linear-gradient(180deg, #a9c5ee 0%, #8bb2e7 100%)",
  "linear-gradient(180deg, #5d93df 0%, #387dd8 100%)",
  "linear-gradient(180deg, #1f60c7 0%, #124ba7 100%)",
];

const STEP_TEXT_TONES = [
  "text-slate-900",
  "text-slate-900",
  "text-slate-900",
  "text-white",
  "text-white",
];

const STEP_WIDTHS = [100, 86, 72, 58, 46];

function formatFunnelValue(stepId: string, value: number) {
  return stepId === "investment" ? formatCurrency(value) : formatNumber(value);
}

function resolveConversionValue(kpis: KpiMetrics) {
  if (kpis.leads > 0) return kpis.leads;
  if (kpis.purchases > 0) return kpis.purchases;
  return kpis.results;
}

function buildSteps(kpis: KpiMetrics): FunnelStep[] {
  const conversions = resolveConversionValue(kpis);

  return [
    {
      id: "investment",
      label: "Investimento",
      value: kpis.investment,
      formattedValue: formatFunnelValue("investment", kpis.investment),
      badge: "Base de mídia do período",
    },
    {
      id: "impressions",
      label: "Impressões",
      value: kpis.impressions,
      formattedValue: formatFunnelValue("impressions", kpis.impressions),
      badge: kpis.cpm > 0 ? `CPM ${formatCurrency(kpis.cpm)}` : null,
    },
    {
      id: "clicks",
      label: "Cliques",
      value: kpis.clicks,
      formattedValue: formatFunnelValue("clicks", kpis.clicks),
      badge: `CTR ${formatPercent(kpis.ctr)}`,
    },
    {
      id: "conversations",
      label: "Conversas",
      value: kpis.messagesStarted,
      formattedValue: formatFunnelValue("conversations", kpis.messagesStarted),
      badge:
        kpis.clicks > 0
          ? `Taxa da etapa ${formatPercent(safeDivide(kpis.messagesStarted, kpis.clicks) * 100)}`
          : "Sem conversas no período",
    },
    {
      id: "conversions",
      label: "Conversões",
      value: conversions,
      formattedValue: formatFunnelValue("conversions", conversions),
      badge:
        kpis.clicks > 0
          ? `Taxa final ${formatPercent(safeDivide(conversions, kpis.clicks) * 100)}`
          : "Sem conversões no período",
    },
  ];
}

export function FunnelViewer({ kpis }: Props) {
  const steps = buildSteps(kpis);

  return (
    <Card className="space-y-5 overflow-hidden px-4 py-6 sm:px-6 sm:py-7">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-white/45">
          Funil principal
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
          Jornada centralizada da operação
        </h2>
        <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-white/58">
          Cliques consolidados em uma única etapa, com separação clara entre conversas e conversões.
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-[760px] flex-col items-center gap-2 sm:gap-3">
        {steps.map((step, index) => {
          const width = STEP_WIDTHS[index];
          const nextWidth = STEP_WIDTHS[index + 1] ?? STEP_WIDTHS[index];
          const topInset = (100 - width) / 2;
          const bottomInset = (100 - nextWidth) / 2;
          const isFinalStep = index === steps.length - 1;

          return (
            <div
              key={step.id}
              className="relative isolate mx-auto w-full"
              style={{
                maxWidth: `${width}%`,
                minHeight: isFinalStep ? "136px" : "102px",
              }}
            >
              <div
                className="absolute inset-0 shadow-[0_22px_38px_rgba(0,0,0,0.18)]"
                style={{
                  clipPath: `polygon(${topInset}% 0%, ${100 - topInset}% 0%, ${100 - bottomInset}% 100%, ${bottomInset}% 100%)`,
                  background: STEP_TONES[index],
                  borderRadius: isFinalStep ? "0 0 18px 18px" : "0",
                }}
              />

              <div
                className={`relative z-10 flex h-full flex-col items-center justify-center gap-1 px-3 py-4 text-center sm:px-4 ${STEP_TEXT_TONES[index]}`}
              >
                <p className={`${isFinalStep ? "text-sm sm:text-base" : "text-sm"} font-semibold`}>
                  {step.label}
                </p>

                <p
                  className={`${
                    isFinalStep
                      ? "text-[1.8rem] sm:text-[2rem]"
                      : "text-[1.7rem] sm:text-[2.1rem]"
                  } font-semibold leading-none tracking-tight`}
                >
                  {step.formattedValue}
                </p>

                {step.badge ? (
                  <span className="inline-flex max-w-[92%] flex-wrap justify-center rounded-full bg-black/15 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-current">
                    {step.badge}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
