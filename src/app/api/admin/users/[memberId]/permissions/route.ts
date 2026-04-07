import { NextResponse } from "next/server";
import { handleApiError, jsonError } from "@/lib/auth/api";
import { requireApiAdminAccess } from "@/lib/auth/guards";
import { APP_ROLES } from "@/lib/auth/constants";
import { updateWorkspaceUserPermissions } from "@/lib/auth/admin-users";

type RouteContext = {
  params: Promise<{
    memberId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const appContext = await requireApiAdminAccess();
    const { memberId } = await context.params;
    const body = (await request.json()) as {
      role?: string;
      permissions?: {
        module: string;
        canView: boolean;
        canEdit: boolean;
      }[];
    };

    if (!body.role || !APP_ROLES.includes(body.role as (typeof APP_ROLES)[number])) {
      return jsonError("Perfil de acesso inválido.", 400);
    }

    if (!Array.isArray(body.permissions)) {
      return jsonError("Envie a matriz de permissões.", 400);
    }

    await updateWorkspaceUserPermissions(
      appContext.workspaceMember.workspace_id,
      memberId,
      appContext.user.id,
      body.role as (typeof APP_ROLES)[number],
      body.permissions.map((permission) => ({
        module: permission.module as any,
        canView: Boolean(permission.canView),
        canEdit: Boolean(permission.canEdit),
      })),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}