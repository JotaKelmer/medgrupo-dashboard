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
  "linear-gradient(180deg, #d7e4f7 0%, #c9d7ea 100%)",
  "linear-gradient(180deg, #c0d2ea 0%, #a9c2e3 100%)",
  "linear-gradient(180deg, #96b7e5 0%, #6f9edc 100%)",
  "linear-gradient(180deg, #4d89de 0%, #2d73d6 100%)",
  "linear-gradient(180deg, #1c5bc0 0%, #11489f 100%)",
];

const STEP_TEXT_TONES = [
  "text-slate-900",
  "text-slate-900",
  "text-slate-900",
  "text-white",
  "text-white",
];

const STEP_WIDTHS = [92, 82, 70, 58, 46];

function formatFunnelValue(stepId: string, value: number) {
  return stepId === "investment" ? formatCurrency(value) : formatNumber(value);
}

function buildFinalStep(kpis: KpiMetrics) {
  if (kpis.messagesStarted > 0 && kpis.leads > 0) {
    const combined = kpis.messagesStarted + kpis.leads;
    return {
      label: "Conversas / Inscrições",
      value: combined,
      badge:
        kpis.linkClicks > 0
          ? `Tx conversão ${formatPercent(
              safeDivide(combined, kpis.linkClicks) * 100,
            )}`
          : null,
    };
  }

  if (kpis.messagesStarted > 0) {
    return {
      label: "Conversas",
      value: kpis.messagesStarted,
      badge:
        kpis.linkClicks > 0
          ? `Tx conversão ${formatPercent(
              safeDivide(kpis.messagesStarted, kpis.linkClicks) * 100,
            )}`
          : null,
    };
  }

  if (kpis.leads > 0) {
    return {
      label: "Inscrições",
      value: kpis.leads,
      badge:
        kpis.linkClicks > 0
          ? `Tx conversão ${formatPercent(
              safeDivide(kpis.leads, kpis.linkClicks) * 100,
            )}`
          : null,
    };
  }

  return {
    label: kpis.resultLabel || "Resultados",
    value: kpis.results,
    badge:
      kpis.linkClicks > 0
        ? `Tx conversão ${formatPercent(
            safeDivide(kpis.results, kpis.linkClicks) * 100,
          )}`
        : null,
  };
}

function buildSteps(kpis: KpiMetrics): FunnelStep[] {
  const finalStep = buildFinalStep(kpis);

  return [
    {
      id: "investment",
      label: "Investimento",
      value: kpis.investment,
      formattedValue: formatFunnelValue("investment", kpis.investment),
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
      id: "link-clicks",
      label: "Cliques no link",
      value: kpis.linkClicks,
      formattedValue: formatFunnelValue("link-clicks", kpis.linkClicks),
      badge:
        kpis.clicks > 0
          ? `Etapa anterior ${formatPercent(
              safeDivide(kpis.linkClicks, kpis.clicks) * 100,
            )}`
          : null,
    },
    {
      id: "final",
      label: finalStep.label,
      value: finalStep.value,
      formattedValue: formatFunnelValue("final", finalStep.value),
      badge: finalStep.badge,
    },
  ];
}

export function FunnelViewer({ kpis }: Props) {
  const steps = buildSteps(kpis);

  return (
    <Card className="space-y-4 overflow-hidden">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-white/45">
          Funil
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Leitura simplificada da jornada principal
        </h2>
      </div>

      <div className="mx-auto flex w-full max-w-[440px] flex-col gap-2">
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
                minHeight: isFinalStep ? "132px" : "96px",
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
                <p
                  className={`${
                    isFinalStep ? "text-sm sm:text-base" : "text-sm"
                  } font-semibold`}
                >
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