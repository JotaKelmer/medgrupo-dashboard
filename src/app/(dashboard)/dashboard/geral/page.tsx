import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { CreativeHealthSection } from "@/components/dashboard/creative-health-section";
import { CreativeMapPanel } from "@/components/dashboard/creative-map-panel";
import { DashboardHeader } from "@/components/dashboard/layout/header";
import { DemographicDonut } from "@/components/dashboard/demographic-donut";
import { FunnelViewer } from "@/components/dashboard/funnel-viewer";
import { KpiGrid } from "@/components/dashboard/kpis-grid";
import { PerformanceTable } from "@/components/dashboard/performance-table";
import { TimelineChart } from "@/components/dashboard/timeline-chart";
import { getDashboardOverview, parseFilters } from "@/lib/dashboard/queries";

export default async function GeralPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filters = parseFilters(await searchParams);
  const data = await getDashboardOverview(filters);

  return (
    <div className="space-y-5 sm:space-y-6">
      <DashboardHeader
        title="Geral"
        subtitle="Leitura executiva de performance, funil, criativos e alertas."
        workspaceOptions={data.workspaceOptions}
        campaignOptions={data.campaignOptions}
        funnelOptions={data.funnelOptions}
        filters={data.filters}
        includeFunnel
        showBrandLogo
      />

      <KpiGrid kpis={data.kpis} />
      <TimelineChart data={data.timeline} />

      <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="min-w-0">
          <FunnelViewer funnel={data.funnel} />
        </div>
        <div className="min-w-0">
          <DemographicDonut data={data.demographics} />
        </div>
      </div>

      <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.75fr)]">
        <div className="min-w-0">
          <CreativeHealthSection
            summary={data.creativeSummary}
            rows={data.creativeRows}
          />
        </div>

        <div className="min-w-0 space-y-6">
          <AlertsPanel alerts={data.alerts} />
          <CreativeMapPanel rows={data.creativeRows} />
        </div>
      </div>

      <PerformanceTable rows={data.performanceRows} />
    </div>
  );
}
