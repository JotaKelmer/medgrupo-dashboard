import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { buildPermissionMap, normalizePermissionRows } from "./permissions";
import type { AppContext } from "./types";

type RawPermission = {
  module: AppContext["permissionRows"][number]["module"];
  can_view: boolean;
  can_edit: boolean;
};

async function loadCurrentAppContext(): Promise<AppContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: member, error: memberError } = await supabase
    .from("workspace_members")
    .select("id, workspace_id, user_id, role, status, mfa_required, is_primary, created_at, updated_at")
    .eq("user_id", user.id)
    .neq("status", "removed")
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberError || !member) {
    return null;
  }

  const [{ data: profile }, { data: workspace }, { data: permissionRows }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id, email, full_name, is_active")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("workspaces")
      .select("id, name, slug, is_active")
      .eq("id", member.workspace_id)
      .maybeSingle(),
    supabase
      .from("workspace_member_permissions")
      .select("module, can_view, can_edit")
      .eq("workspace_member_id", member.id)
      .returns<RawPermission[]>(),
  ]);

  if (!workspace) {
    return null;
  }

  const normalizedPermissionRows = normalizePermissionRows(
    member.role,
    (permissionRows ?? []).map((row) => ({
      module: row.module,
      canView: row.can_view,
      canEdit: row.can_edit,
    })),
  );

  const context: AppContext = {
    user,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      isActive: workspace.is_active,
    },
    profile: {
      id: profile?.id ?? user.id,
      email: profile?.email ?? user.email ?? null,
      fullName:
        profile?.full_name ??
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        null,
      isActive: profile?.is_active ?? true,
    },
    member: {
      id: member.id,
      workspaceId: member.workspace_id,
      userId: member.user_id,
      role: member.role,
      status: member.status,
      mfaRequired: member.mfa_required,
      isPrimary: member.is_primary,
      createdAt: member.created_at,
      updatedAt: member.updated_at,
    },
    permissionRows: normalizedPermissionRows,
    permissions: buildPermissionMap(normalizedPermissionRows),
    isAdmin: member.role === "owner" || member.role === "admin",
    canManageUsers: member.role === "owner" || member.role === "admin",
  };

  return context;
}

export const getCurrentAppContext = cache(loadCurrentAppContext);
