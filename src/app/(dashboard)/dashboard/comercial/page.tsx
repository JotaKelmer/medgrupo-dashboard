import { CommercialDashboardClient } from "@/components/dashboard/commercial/commercial-dashboard-client";
import { requireModuleAccess } from "@/lib/auth/guards";
import {
  getCommercialOverview,
  parseCommercialFilters,
} from "@/lib/commercial/queries";

export default async function ComercialPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const context = await requireModuleAccess("excelencia_comercial");
  const filters = parseCommercialFilters(
    context.workspaceMember.workspace_id,
    await searchParams,
  );

  const overview = await getCommercialOverview({
    workspaceId: context.workspaceMember.workspace_id,
    filters,
    canEdit: context.permissions.excelencia_comercial.canEdit,
    viewerEmail: context.user.email,
    role: context.workspaceMember.role,
  });

  return <CommercialDashboardClient initialData={overview} />;
}
