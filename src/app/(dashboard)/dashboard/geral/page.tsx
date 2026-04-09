// src/app/dashboard/geral/page.tsx

import { DashboardHeader } from "@/components/dashboard/layout/header";
import { FunnelViewer } from "@/components/dashboard/funnel-viewer";
import { KpiGrid } from "@/components/dashboard/kpis-grid";
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
        subtitle="Leitura executiva de performance com foco nos principais KPIs e no funil central da operação."
        workspaceOptions={data.workspaceOptions}
        campaignOptions={data.campaignOptions}
        filters={data.filters}
        includeBusinessUnit
        showBrandLogo
      />

      <KpiGrid
        kpis={data.kpis}
        mediaBenchmarks={data.mediaBenchmarks}
        startDate={data.filters.startDate}
        endDate={data.filters.endDate}
      />

      <TimelineChart data={data.timeline} />

      <div className="mx-auto w-full max-w-6xl">
        <FunnelViewer kpis={data.kpis} />
      </div>
    </div>
  );
}
