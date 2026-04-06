import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { CreativeHealthSection } from "@/components/dashboard/creative-health-section";
import { CreativeMapPanel } from "@/components/dashboard/creative-map-panel";
import { DashboardHeader } from "@/components/dashboard/layout/header";
import { PerformanceTable } from "@/components/dashboard/performance-table";
import { getDashboardOverview, parseFilters } from "@/lib/dashboard/queries";

export default async function InteligenciaOperacionalPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filters = parseFilters(await searchParams);
  const data = await getDashboardOverview(filters);

  return (
    <div className="space-y-5 sm:space-y-6">
      <DashboardHeader
        title="Inteligência Operacional"
        subtitle="Alertas, mapa visual e tabelas operacionais concentrados em uma única visão."
        workspaceOptions={data.workspaceOptions}
        campaignOptions={data.campaignOptions}
        filters={data.filters}
      />

      <div className="grid min-w-0 gap-6 xl:grid-cols-2 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="min-w-0">
          <AlertsPanel alerts={data.alerts} />
        </div>

        <div className="min-w-0">
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
