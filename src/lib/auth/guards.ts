import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AppModule =
  | "geral"
  | "inteligencia_operacional"
  | "excelencia_comercial"
  | "verbas"
  | "plano_midia";

type WorkspaceMemberRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "admin" | "manager" | "analyst" | "viewer";
  status: "invited" | "active" | "suspended";
  is_primary: boolean;
  mfa_required: boolean;
};

type WorkspacePermissionRow = {
  module: AppModule;
  can_view: boolean;
  can_edit: boolean;
};

export type AppContext = {
  user: {
    id: string;
    email: string | null;
  };
  workspaceMember: WorkspaceMemberRow;
  permissions: Record<
    AppModule,
    {
      canView: boolean;
      canEdit: boolean;
    }
  >;
};

const EMPTY_PERMISSIONS: Record<
  AppModule,
  {
    canView: boolean;
    canEdit: boolean;
  }
> = {
  geral: { canView: false, canEdit: false },
  inteligencia_operacional: { canView: false, canEdit: false },
  excelencia_comercial: { canView: false, canEdit: false },
  verbas: { canView: false, canEdit: false },
  plano_midia: { canView: false, canEdit: false },
};

async function getAppContextInternal(): Promise<AppContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: workspaceMember, error: memberError } = await supabase
    .from("workspace_members")
    .select("id, workspace_id, user_id, role, status, is_primary, mfa_required")
    .eq("user_id", user.id)
    .in("status", ["invited", "active"])
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (memberError || !workspaceMember) {
    return null;
  }

  const { data: permissionRows, error: permissionsError } = await supabase
    .from("workspace_member_permissions")
    .select("module, can_view, can_edit")
    .eq("workspace_member_id", workspaceMember.id);

  if (permissionsError) {
    return null;
  }

  const permissions = { ...EMPTY_PERMISSIONS };

  for (const row of (permissionRows ?? []) as WorkspacePermissionRow[]) {
    permissions[row.module] = {
      canView: row.can_view,
      canEdit: row.can_edit,
    };
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    workspaceMember: workspaceMember as WorkspaceMemberRow,
    permissions,
  };
}

export async function requireAppContext(): Promise<AppContext> {
  const context = await getAppContextInternal();

  if (!context) {
    redirect("/login?error=sem-acesso");
  }

  return context;
}

export async function requireAdminAccess() {
  const context = await requireAppContext();

  if (
    context.workspaceMember.role !== "owner" &&
    context.workspaceMember.role !== "admin"
  ) {
    redirect("/dashboard/geral");
  }

  return context;
}

export async function requireModuleAccess(module: AppModule) {
  const context = await requireAppContext();

  if (!context.permissions[module]?.canView) {
    redirect("/dashboard/geral");
  }

  return context;
}

export async function requireModuleEditAccess(module: AppModule) {
  const context = await requireAppContext();

  if (!context.permissions[module]?.canEdit) {
    redirect("/dashboard/geral");
  }

  return context;
}

export async function requireApiAppContext(): Promise<AppContext> {
  const context = await getAppContextInternal();

  if (!context) {
    throw new Error("UNAUTHORIZED");
  }

  return context;
}

export async function requireApiAdminAccess(): Promise<AppContext> {
  const context = await requireApiAppContext();

  if (
    context.workspaceMember.role !== "owner" &&
    context.workspaceMember.role !== "admin"
  ) {
    throw new Error("FORBIDDEN");
  }

  return context;
}

export async function requireApiModuleAccess(module: AppModule): Promise<AppContext> {
  const context = await requireApiAppContext();

  if (!context.permissions[module]?.canView) {
    throw new Error("FORBIDDEN");
  }

  return context;
}

export async function requireApiModuleEditAccess(
  module: AppModule,
): Promise<AppContext> {
  const context = await requireApiAppContext();

  if (!context.permissions[module]?.canEdit) {
    throw new Error("FORBIDDEN");
  }

  return context;
}
