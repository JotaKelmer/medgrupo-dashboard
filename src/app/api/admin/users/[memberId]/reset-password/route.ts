import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/auth/api";
import { requireApiAdminAccess } from "@/lib/auth/guards";
import { sendWorkspaceUserPasswordReset } from "@/lib/auth/admin-users";

type RouteContext = {
  params: Promise<{
    memberId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const appContext = await requireApiAdminAccess();
    const { memberId } = await context.params;

    await sendWorkspaceUserPasswordReset({
      workspaceId: appContext.workspaceMember.workspace_id,
      memberId,
      actorUserId: appContext.user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}