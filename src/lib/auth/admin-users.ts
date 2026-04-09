import "server-only";

import { MAX_WORKSPACE_USERS, type AppRole } from "./constants";
import { createDefaultPermissionRows, normalizePermissionRows } from "./permissions";
import type { EditableWorkspaceUserPayload, ModulePermission, WorkspaceUserListItem } from "./types";
import {
  assertSupabaseAdmin,
  getSupabaseServerDataClient,
} from "@/lib/supabase/admin";
import { buildAbsoluteUrl, normalizeEmail } from "./utils";

type RawMembership = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: AppRole;
  status: WorkspaceUserListItem["status"];
  mfa_required: boolean;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

type RawProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type RawPermission = {
  workspace_member_id: string;
  module: ModulePermission["module"];
  can_view: boolean;
  can_edit: boolean;
};

function buildPermissionUpserts(memberId: string, role: AppRole, permissions?: ModulePermission[]) {
  const rows = normalizePermissionRows(role, permissions);

  return rows.map((permission) => ({
    workspace_member_id: memberId,
    module: permission.module,
    can_view: permission.canView,
    can_edit: permission.canEdit,
  }));
}

async function insertAuditLog(input: {
  workspaceId: string;
  actorUserId: string;
  targetUserId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = assertSupabaseAdmin();

  await admin.from("audit_logs").insert({
    workspace_id: input.workspaceId,
    actor_user_id: input.actorUserId,
    target_user_id: input.targetUserId ?? null,
    action: input.action,
    metadata: input.metadata ?? {},
  });
}

export async function countWorkspaceUsers(workspaceId: string) {
  const admin = assertSupabaseAdmin();

  const { count, error } = await admin
    .from("workspace_members")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .in("status", ["invited", "active"]);

  if (error) {
    throw new Error("Não foi possível validar o limite de usuários do workspace.");
  }

  return count ?? 0;
}

export async function listWorkspaceUsers(workspaceId: string): Promise<WorkspaceUserListItem[]> {
  const admin = assertSupabaseAdmin();

  const { data: memberships, error: membershipError } = await admin
    .from("workspace_members")
    .select("id, workspace_id, user_id, role, status, mfa_required, is_primary, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .neq("status", "removed")
    .order("created_at", { ascending: true })
    .returns<RawMembership[]>();

  if (membershipError) {
    throw new Error("Não foi possível carregar os usuários do workspace.");
  }

  if (!memberships?.length) {
    return [];
  }

  const userIds = memberships.map((membership) => membership.user_id);
  const memberIds = memberships.map((membership) => membership.id);

  const [{ data: profiles }, { data: permissions }] = await Promise.all([
    admin
      .from("user_profiles")
      .select("id, email, full_name")
      .in("id", userIds)
      .returns<RawProfile[]>(),
    admin
      .from("workspace_member_permissions")
      .select("workspace_member_id, module, can_view, can_edit")
      .in("workspace_member_id", memberIds)
      .returns<RawPermission[]>(),
  ]);

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const permissionsByMemberId = new Map<string, ModulePermission[]>();

  for (const permission of permissions ?? []) {
    const current = permissionsByMemberId.get(permission.workspace_member_id) ?? [];
    current.push({
      module: permission.module,
      canView: permission.can_view,
      canEdit: permission.can_edit,
    });
    permissionsByMemberId.set(permission.workspace_member_id, current);
  }

  return memberships.map((membership) => {
    const profile = profilesById.get(membership.user_id);
    return {
      id: membership.id,
      userId: membership.user_id,
      workspaceId: membership.workspace_id,
      email: profile?.email ?? null,
      fullName: profile?.full_name ?? null,
      role: membership.role,
      status: membership.status,
      mfaRequired: membership.mfa_required,
      isPrimary: membership.is_primary,
      createdAt: membership.created_at,
      updatedAt: membership.updated_at,
      permissions: normalizePermissionRows(
        membership.role,
        permissionsByMemberId.get(membership.id),
      ),
    };
  });
}

export async function inviteWorkspaceUser(input: {
  workspaceId: string;
  actorUserId: string;
  email: string;
  fullName?: string | null;
  role: AppRole;
  mfaRequired?: boolean;
  permissions?: ModulePermission[];
}) {
  const normalizedEmail = normalizeEmail(input.email);
  const currentUsers = await countWorkspaceUsers(input.workspaceId);

  if (currentUsers >= MAX_WORKSPACE_USERS) {
    throw new Error(`Limite de ${MAX_WORKSPACE_USERS} usuários atingido para este workspace.`);
  }

  const admin = assertSupabaseAdmin();
  const redirectTo = buildAbsoluteUrl("/auth/callback?next=/reset-password&flow=invite");

  const inviteResult = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
    redirectTo,
    data: {
      full_name: input.fullName ?? "",
      workspace_id: input.workspaceId,
    },
  });

  if (inviteResult.error || !inviteResult.data.user) {
    throw new Error(
      inviteResult.error?.message ||
        "Não foi possível enviar o convite para o usuário informado.",
    );
  }

  const invitedUser = inviteResult.data.user;

  const profileUpsert = await admin.from("user_profiles").upsert(
    {
      id: invitedUser.id,
      email: normalizedEmail,
      full_name: input.fullName ?? null,
      is_active: true,
    },
    { onConflict: "id" },
  );

  if (profileUpsert.error) {
    throw new Error("Não foi possível sincronizar o perfil do usuário convidado.");
  }

  const memberUpsert = await admin
    .from("workspace_members")
    .upsert(
      {
        workspace_id: input.workspaceId,
        user_id: invitedUser.id,
        role: input.role,
        status: "invited",
        mfa_required: Boolean(input.mfaRequired),
        invited_by: input.actorUserId,
      },
      { onConflict: "workspace_id,user_id" },
    )
    .select("id, user_id")
    .single();

  if (memberUpsert.error || !memberUpsert.data) {
    throw new Error("Não foi possível criar o vínculo do usuário com o workspace.");
  }

  const permissionUpsert = await admin.from("workspace_member_permissions").upsert(
    buildPermissionUpserts(memberUpsert.data.id, input.role, input.permissions),
    { onConflict: "workspace_member_id,module" },
  );

  if (permissionUpsert.error) {
    throw new Error("Não foi possível salvar as permissões iniciais do usuário.");
  }

  await insertAuditLog({
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    targetUserId: invitedUser.id,
    action: "user.invited",
    metadata: {
      email: normalizedEmail,
      role: input.role,
      mfaRequired: Boolean(input.mfaRequired),
    },
  });

  return memberUpsert.data;
}

export async function updateWorkspaceUser(
  workspaceId: string,
  memberId: string,
  actorUserId: string,
  payload: EditableWorkspaceUserPayload,
) {
  const admin = assertSupabaseAdmin();

  const memberLookup = await admin
    .from("workspace_members")
    .select("id, user_id, role, status")
    .eq("id", memberId)
    .eq("workspace_id", workspaceId)
    .single();

  if (memberLookup.error || !memberLookup.data) {
    throw new Error("Usuário do workspace não encontrado.");
  }

  const nextRole = payload.role ?? memberLookup.data.role;
  const nextStatus = payload.status ?? memberLookup.data.status;

  if (
    memberLookup.data.user_id === actorUserId &&
    (nextStatus === "suspended" || nextStatus === "removed" || (nextRole !== "owner" && nextRole !== "admin"))
  ) {
    throw new Error("Use outro administrador para alterar ou remover o seu próprio acesso.");
  }

  const updateResult = await admin
    .from("workspace_members")
    .update({
      role: nextRole,
      status: nextStatus,
      mfa_required: payload.mfaRequired,
    })
    .eq("id", memberId)
    .eq("workspace_id", workspaceId);

  if (updateResult.error) {
    throw new Error("Não foi possível atualizar o usuário.");
  }

  if (typeof payload.fullName !== "undefined") {
    const profileUpdate = await admin
      .from("user_profiles")
      .update({ full_name: payload.fullName ?? null })
      .eq("id", memberLookup.data.user_id);

    if (profileUpdate.error) {
      throw new Error("Não foi possível atualizar o nome do usuário.");
    }
  }

  if (payload.permissions) {
    const permissionUpsert = await admin.from("workspace_member_permissions").upsert(
      buildPermissionUpserts(memberId, nextRole, payload.permissions),
      { onConflict: "workspace_member_id,module" },
    );

    if (permissionUpsert.error) {
      throw new Error("Não foi possível atualizar as permissões do usuário.");
    }
  }

  await insertAuditLog({
    workspaceId,
    actorUserId,
    targetUserId: memberLookup.data.user_id,
    action: "user.updated",
    metadata: {
      memberId,
      role: payload.role,
      status: payload.status,
      mfaRequired: payload.mfaRequired,
    },
  });
}

export async function updateWorkspaceUserPermissions(
  workspaceId: string,
  memberId: string,
  actorUserId: string,
  role: AppRole,
  permissions: ModulePermission[],
) {
  const admin = assertSupabaseAdmin();

  const memberLookup = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("id", memberId)
    .eq("workspace_id", workspaceId)
    .single();

  if (memberLookup.error || !memberLookup.data) {
    throw new Error("Usuário do workspace não encontrado.");
  }

  const permissionUpsert = await admin.from("workspace_member_permissions").upsert(
    buildPermissionUpserts(memberId, role, permissions),
    { onConflict: "workspace_member_id,module" },
  );

  if (permissionUpsert.error) {
    throw new Error("Não foi possível salvar a matriz de permissões.");
  }

  await insertAuditLog({
    workspaceId,
    actorUserId,
    targetUserId: memberLookup.data.user_id,
    action: "user.permissions_updated",
    metadata: {
      memberId,
      permissions,
    },
  });
}

export async function removeWorkspaceUser(
  workspaceId: string,
  memberId: string,
  actorUserId: string,
) {
  const admin = assertSupabaseAdmin();

  const lookup = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("id", memberId)
    .eq("workspace_id", workspaceId)
    .single();

  if (lookup.error || !lookup.data) {
    throw new Error("Usuário do workspace não encontrado.");
  }

  if (lookup.data.user_id === actorUserId) {
    throw new Error("Use outro administrador para remover o seu próprio acesso.");
  }

  const updateResult = await admin
    .from("workspace_members")
    .update({
      status: "removed",
      is_primary: false,
    })
    .eq("id", memberId)
    .eq("workspace_id", workspaceId);

  if (updateResult.error) {
    throw new Error("Não foi possível remover o usuário do workspace.");
  }

  await insertAuditLog({
    workspaceId,
    actorUserId,
    targetUserId: lookup.data.user_id,
    action: "user.removed",
    metadata: {
      memberId,
    },
  });
}

export async function sendWorkspaceUserPasswordReset(input: {
  workspaceId: string;
  memberId: string;
  actorUserId: string;
}) {
  const admin = assertSupabaseAdmin();

  const lookup = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("id", input.memberId)
    .eq("workspace_id", input.workspaceId)
    .single();

  if (lookup.error || !lookup.data) {
    throw new Error("Usuário do workspace não encontrado.");
  }

  const profileLookup = await admin
    .from("user_profiles")
    .select("email")
    .eq("id", lookup.data.user_id)
    .single();

  const email = profileLookup.data?.email;

  if (profileLookup.error || !email) {
    throw new Error("O usuário não possui um e-mail válido para redefinição de senha.");
  }

  const authClient = getSupabaseServerDataClient();

  if (!authClient) {
    throw new Error("Supabase não configurado para envio de e-mails de recuperação.");
  }

  const redirectTo = buildAbsoluteUrl("/auth/callback?next=/reset-password&flow=recovery");
  const resetResult = await authClient.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (resetResult.error) {
    throw new Error(
      resetResult.error.message ||
        "Não foi possível enviar o e-mail de redefinição de senha.",
    );
  }

  await insertAuditLog({
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    targetUserId: lookup.data.user_id,
    action: "user.password_reset_requested",
    metadata: {
      memberId: input.memberId,
      email,
    },
  });
}

export function createDefaultUserPermissions(role: AppRole) {
  return createDefaultPermissionRows(role);
}
