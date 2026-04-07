import type { User } from "@supabase/supabase-js";
import type { AppModule, AppRole } from "./constants";

export type ModulePermission = {
  module: AppModule;
  canView: boolean;
  canEdit: boolean;
};

export type ModulePermissionMap = Record<
  AppModule,
  {
    canView: boolean;
    canEdit: boolean;
  }
>;

export type UserProfile = {
  id: string;
  email: string | null;
  fullName: string | null;
  isActive: boolean;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

export type WorkspaceMemberRecord = {
  id: string;
  workspaceId: string;
  userId: string;
  role: AppRole;
  status: "invited" | "active" | "suspended" | "removed";
  mfaRequired: boolean;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AppContext = {
  user: User;
  workspace: WorkspaceSummary;
  profile: UserProfile;
  member: WorkspaceMemberRecord;
  permissions: ModulePermissionMap;
  permissionRows: ModulePermission[];
  isAdmin: boolean;
  canManageUsers: boolean;
};

export type WorkspaceUserListItem = {
  id: string;
  userId: string;
  workspaceId: string;
  email: string | null;
  fullName: string | null;
  role: AppRole;
  status: "invited" | "active" | "suspended" | "removed";
  mfaRequired: boolean;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: ModulePermission[];
};

export type EditableWorkspaceUserPayload = {
  fullName?: string | null;
  role?: AppRole;
  status?: "invited" | "active" | "suspended" | "removed";
  mfaRequired?: boolean;
  permissions?: ModulePermission[];
};
