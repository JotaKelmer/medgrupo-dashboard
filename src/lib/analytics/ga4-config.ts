type Ga4RuntimeConfig = {
  propertyId: string;
  projectId?: string;
  clientEmail: string;
  privateKey: string;
};

function assertString(value: string | undefined, label: string): string {
  if (!value || !value.trim()) {
    throw new Error(`[GA4] Variável de ambiente ausente: ${label}`);
  }

  return value.trim();
}

function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, '\n');
}

function readFromServiceAccountJson(): Omit<Ga4RuntimeConfig, 'propertyId'> | null {
  const rawJson = process.env.GA4_SERVICE_ACCOUNT_JSON?.trim();

  if (!rawJson) {
    return null;
  }

  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(rawJson) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `[GA4] Não foi possível fazer parse de GA4_SERVICE_ACCOUNT_JSON: ${
        error instanceof Error ? error.message : 'erro desconhecido'
      }`,
    );
  }

  const clientEmail = String(parsed.client_email ?? '');
  const privateKey = String(parsed.private_key ?? '');
  const projectId =
    typeof parsed.project_id === 'string' ? parsed.project_id : undefined;

  if (!clientEmail || !privateKey) {
    throw new Error(
      '[GA4] GA4_SERVICE_ACCOUNT_JSON precisa conter client_email e private_key.',
    );
  }

  return {
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
    projectId,
  };
}

let cachedConfig: Ga4RuntimeConfig | null = null;

export function getGa4RuntimeConfig(): Ga4RuntimeConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const propertyId = assertString(process.env.GA4_PROPERTY_ID, 'GA4_PROPERTY_ID');
  const serviceAccountConfig = readFromServiceAccountJson();

  if (serviceAccountConfig) {
    cachedConfig = {
      propertyId,
      ...serviceAccountConfig,
    };

    return cachedConfig;
  }

  const clientEmail = assertString(process.env.GA4_CLIENT_EMAIL, 'GA4_CLIENT_EMAIL');
  const privateKey = normalizePrivateKey(
    assertString(process.env.GA4_PRIVATE_KEY, 'GA4_PRIVATE_KEY'),
  );

  cachedConfig = {
    propertyId,
    clientEmail,
    privateKey,
    projectId: process.env.GA4_PROJECT_ID?.trim() || undefined,
  };

  return cachedConfig;
}
