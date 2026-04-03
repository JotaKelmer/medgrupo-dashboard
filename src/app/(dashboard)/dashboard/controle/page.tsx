import { CreativeRulesForm } from "@/components/dashboard/creative-rules-form";
import { CustomMetricManager } from "@/components/dashboard/custom-metric-manager";
import { FunnelBuilder } from "@/components/dashboard/funnel-builder";
import { DashboardHeader } from "@/components/dashboard/layout/header";
import { SyncRunsPanel } from "@/components/dashboard/sync-runs-panel";
import { getControlOverview, parseFilters } from "@/lib/dashboard/queries";

export default async function ControlePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filters = parseFilters(await searchParams);
  const data = await getControlOverview(filters);

  return (
    <div className="space-y-5 sm:space-y-6">
      <DashboardHeader
        title="Controle"
        subtitle="Operação técnica, syncs, métricas customizadas e builder de funil."
        workspaceOptions={data.workspaceOptions}
        campaignOptions={[]}
        filters={data.filters}
      />



      <div className="grid gap-6 2xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0">
          <SyncRunsPanel syncRuns={data.syncRuns} />
        </div>
        <div className="min-w-0">
          <CreativeRulesForm
            workspaceId={data.filters.workspaceId}
            initialRules={data.creativeRules}
          />
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="min-w-0">
          <CustomMetricManager
            workspaceId={data.filters.workspaceId}
            initialMetrics={data.customMetrics}
          />
        </div>
        <div className="min-w-0">
          <FunnelBuilder
            workspaceId={data.filters.workspaceId}
            funnels={data.funnels}
            customMetrics={data.customMetrics}
          />
        </div>
      </div>
    </div>
  );
}