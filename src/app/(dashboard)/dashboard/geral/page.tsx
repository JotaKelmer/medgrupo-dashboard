import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { CreativeHealthSection } from "@/components/dashboard/creative-health-section";
import { CreativeMapPanel } from "@/components/dashboard/creative-map-panel";
import { DashboardHeader } from "@/components/dashboard/layout/header";
import { FunnelViewer } from "@/components/dashboard/funnel-viewer";
import { KpiGrid } from "@/components/dashboard/kpis-grid";
import { PerformanceTable } from "@/components/dashboard/performance-table";
import { TimelineChart } from "@/components/dashboard/timeline-chart";
import { getDashboardOverview, parseFilters } from "@/lib/dashboard/queries";

export default async function GeralPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filters = parseFilters(await searchParams);
  const data = await getDashboardOverview(filters);

  return (
    <div className="space-y-5 sm:space-y-6">
      <DashboardHeader
        title="Geral"
        subtitle="Leitura executiva de performance com foco em KPIs principais, funil e operação."
        workspaceOptions={data.workspaceOptions}
        campaignOptions={data.campaignOptions}
        funnelOptions={data.funnelOptions}
        filters={data.filters}
        includeFunnel
        showBrandLogo
      />

      <KpiGrid
        kpis={data.kpis}
        mediaBenchmarks={data.mediaBenchmarks}
        startDate={data.filters.startDate}
        endDate={data.filters.endDate}
      />

      <TimelineChart data={data.timeline} />

      <div className="grid min-w-0 gap-6 xl:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <FunnelViewer kpis={data.kpis} />
        </div>

        <div className="min-w-0 space-y-6">
          <AlertsPanel alerts={data.alerts} />
          <CreativeMapPanel rows={data.creativeRows} />
        </div>
      </div>

      <CreativeHealthSection
        summary={data.creativeSummary}
        rows={data.creativeRows}
      />

      <PerformanceTable rows={data.performanceRows} />
    </div>
  );
}