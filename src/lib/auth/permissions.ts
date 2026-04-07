import { APP_MODULES, type AppModule, type AppRole } from "./constants";
import type { AppContext, ModulePermission, ModulePermissionMap } from "./types";

function defaultModulePermission(role: AppRole, module: AppModule) {
  switch (role) {
    case "owner":
    case "admin":
    case "manager":
      return { canView: true, canEdit: true };
    case "analyst":
      return {
        canView: true,
        canEdit: module === "geral" || module === "inteligencia_operacional",
      };
    case "viewer":
    default:
      return { canView: true, canEdit: false };
  }
}

export function getDefaultPermissionMap(role: AppRole): ModulePermissionMap {
  return APP_MODULES.reduce((accumulator, module) => {
    accumulator[module] = defaultModulePermission(role, module);
    return accumulator;
  }, {} as ModulePermissionMap);
}

export function createDefaultPermissionRows(role: AppRole): ModulePermission[] {
  const map = getDefaultPermissionMap(role);

  return APP_MODULES.map((module) => ({
    module,
    canView: map[module].canView,
    canEdit: map[module].canEdit,
  }));
}

export function normalizePermissionRows(
  role: AppRole,
  rows?: ModulePermission[] | null,
): ModulePermission[] {
  const defaults = getDefaultPermissionMap(role);

  return APP_MODULES.map((module) => {
    const current = rows?.find((row) => row.module === module);

    return {
      module,
      canView: current?.canView ?? defaults[module].canView,
      canEdit: current?.canEdit ?? defaults[module].canEdit,
    };
  });
}

export function buildPermissionMap(rows: ModulePermission[]): ModulePermissionMap {
  return APP_MODULES.reduce((accumulator, module) => {
    const current = rows.find((row) => row.module === module);

    accumulator[module] = {
      canView: Boolean(current?.canView),
      canEdit: Boolean(current?.canEdit),
    };

    return accumulator;
  }, {} as ModulePermissionMap);
}

export function isPrivilegedRole(role: AppRole) {
  return role === "owner" || role === "admin";
}

export function canManageUsers(context: Pick<AppContext, "member">) {
  return isPrivilegedRole(context.member.role);
}

export function canViewModule(
  context: Pick<AppContext, "permissions">,
  module: AppModule,
) {
  return Boolean(context.permissions[module]?.canView);
}

export function canEditModule(
  context: Pick<AppContext, "permissions">,
  module: AppModule,
) {
  return Boolean(context.permissions[module]?.canEdit);
}
