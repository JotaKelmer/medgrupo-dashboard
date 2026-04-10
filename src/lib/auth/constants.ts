export type AppRole =
  | "owner"
  | "admin"
  | "manager"
  | "analyst"
  | "viewer";

export type AppModule =
  | "geral"
  | "inteligencia_operacional"
  | "excelencia_comercial"
  | "verbas"
  | "plano_midia";

export const APP_ROLES = [
  "owner",
  "admin",
  "manager",
  "analyst",
  "viewer",
] as const satisfies readonly AppRole[];

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  owner: "Owner",
  admin: "Administrador",
  manager: "Gestor",
  analyst: "Analista",
  viewer: "Leitor",
};

export const APP_MODULES = [
  "geral",
  "inteligencia_operacional",
  "excelencia_comercial",
  "verbas",
  "plano_midia",
] as const satisfies readonly AppModule[];

export const APP_MODULE_LABELS: Record<AppModule, string> = {
  geral: "Geral",
  inteligencia_operacional: "Inteligência Operacional",
  excelencia_comercial: "Excelência Comercial",
  verbas: "Verbas",
  plano_midia: "Plano de Mídia",
};

export const DEFAULT_AFTER_LOGIN_PATH = "/dashboard/geral";
export const MAX_WORKSPACE_USERS = Number(process.env.MAX_WORKSPACE_USERS || "100");
