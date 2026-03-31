import { createClient } from "@supabase/supabase-js";

export type SupabaseClientMode = "service_role" | "public" | "missing";

export type SupabaseConfigDiagnostics = {
  urlConfigured: boolean;
  publishableKeyConfigured: boolean;
  anonKeyConfigured: boolean;
  serviceRoleConfigured: boolean;
  mocksEnabled: boolean;
  clientMode: SupabaseClientMode;
};

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function resolveUrl() {
  return readEnv("NEXT_PUBLIC_SUPABASE_URL");
}

function resolvePublicKey() {
  return (
    readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}

function resolveServiceRoleKey() {
  return readEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function resolveServerKey() {
  return resolveServiceRoleKey() || resolvePublicKey();
}

function createRuntimeClient(key: string) {
  const url = resolveUrl();

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabaseConfigDiagnostics(): SupabaseConfigDiagnostics {
  const urlConfigured = Boolean(resolveUrl());
  const publishableKeyConfigured = Boolean(readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"));
  const anonKeyConfigured = Boolean(readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const serviceRoleConfigured = Boolean(resolveServiceRoleKey());
  const mocksEnabled = readEnv("NEXT_PUBLIC_ENABLE_MOCKS").toLowerCase() === "true";

  return {
    urlConfigured,
    publishableKeyConfigured,
    anonKeyConfigured,
    serviceRoleConfigured,
    mocksEnabled,
    clientMode: !urlConfigured
      ? "missing"
      : serviceRoleConfigured
      ? "service_role"
      : publishableKeyConfigured || anonKeyConfigured
      ? "public"
      : "missing",
  };
}

export function hasSupabaseReadConfig() {
  const diagnostics = getSupabaseConfigDiagnostics();
  return diagnostics.clientMode !== "missing";
}

export function hasSupabaseAdminConfig() {
  const diagnostics = getSupabaseConfigDiagnostics();
  return diagnostics.urlConfigured && diagnostics.serviceRoleConfigured;
}

export function hasSupabaseConfig() {
  return hasSupabaseReadConfig();
}

export function shouldUseMocks() {
  return readEnv("NEXT_PUBLIC_ENABLE_MOCKS").toLowerCase() === "true";
}

export function isSupabaseUsingServiceRole() {
  return getSupabaseConfigDiagnostics().clientMode === "service_role";
}

export function buildSupabaseConfigError(scope: string, requireWriteAccess = false) {
  const diagnostics = getSupabaseConfigDiagnostics();
  const missing: string[] = [];

  if (!diagnostics.urlConfigured) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (requireWriteAccess) {
    if (!diagnostics.serviceRoleConfigured && !diagnostics.publishableKeyConfigured && !diagnostics.anonKeyConfigured) {
      missing.push(
        "SUPABASE_SERVICE_ROLE_KEY (recomendado para escrita) ou uma chave pública configurada"
      );
    }
  } else if (!diagnostics.publishableKeyConfigured && !diagnostics.anonKeyConfigured && !diagnostics.serviceRoleConfigured) {
    missing.push(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  const base = missing.length
    ? `${scope}: configuração do Supabase incompleta. Faltando ${missing.join(", ")}.`
    : `${scope}: não foi possível inicializar o cliente do Supabase.`;

  if (requireWriteAccess && diagnostics.clientMode === "public") {
    return `${base} A rota está usando chave pública no servidor. Isso só funciona se o projeto permitir escrita com essa credencial; para sync estável, configure SUPABASE_SERVICE_ROLE_KEY.`;
  }

  return base;
}

export function getSupabaseServerDataClient() {
  return createRuntimeClient(resolveServerKey());
}

export function getSupabaseAdmin() {
  return createRuntimeClient(resolveServerKey());
}

export function assertSupabaseServerDataClient() {
  const client = getSupabaseServerDataClient();

  if (!client) {
    throw new Error(buildSupabaseConfigError("Dashboard", false));
  }

  return client;
}

export function assertSupabaseAdmin() {
  const client = getSupabaseAdmin();

  if (!client) {
    throw new Error(buildSupabaseConfigError("Sync", true));
  }

  return client;
}
