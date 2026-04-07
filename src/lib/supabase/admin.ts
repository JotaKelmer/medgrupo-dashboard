import "server-only";

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

function createRuntimeClient(key: string) {
  const url = resolveUrl();

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
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
    if (!diagnostics.serviceRoleConfigured) {
      missing.push("SUPABASE_SERVICE_ROLE_KEY");
    }
  } else if (
    !diagnostics.publishableKeyConfigured &&
    !diagnostics.anonKeyConfigured &&
    !diagnostics.serviceRoleConfigured
  ) {
    missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return missing.length
    ? `${scope}: configuração do Supabase incompleta. Faltando ${missing.join(", ")}.`
    : `${scope}: não foi possível inicializar o cliente do Supabase.`;
}

export function getSupabaseServerDataClient() {
  const key = resolveServiceRoleKey() || resolvePublicKey();
  return createRuntimeClient(key);
}

export function createSupabaseAdminClient() {
  const key = resolveServiceRoleKey();
  return createRuntimeClient(key);
}

export function getSupabaseAdmin() {
  return createSupabaseAdminClient();
}

export function assertSupabaseServerDataClient() {
  const client = getSupabaseServerDataClient();

  if (!client) {
    throw new Error(buildSupabaseConfigError("Dashboard", false));
  }

  return client;
}

export function assertSupabaseAdmin() {
  const client = createSupabaseAdminClient();

  if (!client) {
    throw new Error(buildSupabaseConfigError("Admin", true));
  }

  return client;
}
