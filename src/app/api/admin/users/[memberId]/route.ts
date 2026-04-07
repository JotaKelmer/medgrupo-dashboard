import { NextResponse } from "next/server";
import { handleApiError, jsonError } from "@/lib/auth/api";
import { requireApiAdminAccess } from "@/lib/auth/guards";
import { APP_ROLES } from "@/lib/auth/constants";
import {
  removeWorkspaceUser,
  updateWorkspaceUser,
} from "@/lib/auth/admin-users";

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
      fullName?: string | null;
      role?: string;
      status?: "invited" | "active" | "suspended" | "removed";
      mfaRequired?: boolean;
      permissions?: {
        module: string;
        canView: boolean;
        canEdit: boolean;
      }[];
    };

    if (
      body.role &&
      !APP_ROLES.includes(body.role as (typeof APP_ROLES)[number])
    ) {
      return jsonError("Perfil de acesso inválido.", 400);
    }

    await updateWorkspaceUser(
      appContext.workspaceMember.workspace_id,
      memberId,
      appContext.user.id,
      {
        fullName: body.fullName,
        role: body.role as (typeof APP_ROLES)[number] | undefined,
        status: body.status,
        mfaRequired: body.mfaRequired,
        permissions: Array.isArray(body.permissions)
          ? body.permissions.map((permission) => ({
              module: permission.module as any,
              canView: Boolean(permission.canView),
              canEdit: Boolean(permission.canEdit),
            }))
          : undefined,
      },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const appContext = await requireApiAdminAccess();
    const { memberId } = await context.params;

    await removeWorkspaceUser(
      appContext.workspaceMember.workspace_id,
      memberId,
      appContext.user.id,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}