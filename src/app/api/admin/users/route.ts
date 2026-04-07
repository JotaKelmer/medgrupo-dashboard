import { NextResponse } from "next/server";

import { handleApiError, jsonError } from "@/lib/auth/api";
import { requireApiAdminAccess } from "@/lib/auth/guards";
import {
  countWorkspaceUsers,
  inviteWorkspaceUser,
  listWorkspaceUsers,
} from "@/lib/auth/admin-users";

export async function GET() {
  try {
    const context = await requireApiAdminAccess();

    const [users, currentUsers] = await Promise.all([
      listWorkspaceUsers(context.workspaceMember.workspace_id),
      countWorkspaceUsers(context.workspaceMember.workspace_id),
    ]);

    return NextResponse.json({
      users,
      currentUsers,
      maxUsers: Number(process.env.MAX_WORKSPACE_USERS ?? 10),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireApiAdminAccess();
    const body = await request.json();

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const fullName =
      typeof body.fullName === "string" ? body.fullName.trim() : "";
    const role = body.role;
    const mfaRequired = Boolean(body.mfaRequired);
    const permissions = body.permissions;

    if (!email) {
      return jsonError("E-mail é obrigatório.", 400);
    }

    await inviteWorkspaceUser({
      workspaceId: context.workspaceMember.workspace_id,
      actorUserId: context.user.id,
      email,
      fullName,
      role,
      mfaRequired,
      permissions,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}