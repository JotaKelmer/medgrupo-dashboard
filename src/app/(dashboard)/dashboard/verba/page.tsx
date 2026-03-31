import { BudgetPlannerPanel } from "@/components/dashboard/budget-planner-panel";
import { DashboardHeader } from "@/components/dashboard/layout/header";
import { getBudgetOverview, parseFilters } from "@/lib/dashboard/queries";

export default async function VerbaPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filters = parseFilters(await searchParams);
  const data = await getBudgetOverview(filters);

  return (
    <div className="space-y-5 sm:space-y-6">
      <DashboardHeader
        title="Verba"
        subtitle="Planejamento de mídia, distribuição por canal e projeção de resultados."
        workspaceOptions={data.workspaceOptions}
        campaignOptions={data.campaignOptions}
        filters={data.filters}
      />

      <BudgetPlannerPanel
        initialState={data.budgetPlan}
        comparison={data.budgetComparison}
      />
    </div>
  );
}
