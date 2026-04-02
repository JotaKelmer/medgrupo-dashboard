import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function getIncomingSecret(request: NextRequest) {
  const syncSecret = request.headers.get("x-sync-secret")?.trim();
  if (syncSecret) return syncSecret;

  const authorization = request.headers.get("authorization")?.trim() || "";
  const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
  return bearerMatch?.[1]?.trim() ?? "";
}

function getAcceptedSecrets() {
  return Array.from(
    new Set([readEnv("INTERNAL_SYNC_SECRET"), readEnv("CRON_SECRET")].filter(Boolean))
  );
}

function getSecretForInternalCalls() {
  return readEnv("INTERNAL_SYNC_SECRET") || readEnv("CRON_SECRET") || "";
}

async function callInternalSync(params: {
  request: NextRequest;
  path: string;
  secret: string;
}) {
  const { request, path, secret } = params;
  const url = new URL(path, request.nextUrl.origin);

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
    headers: {
      "x-sync-secret": secret,
    },
  });

  const data = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    status: response.status,
    path: url.pathname + url.search,
    data,
  };
}

async function handleDailySync(request: NextRequest) {
  const acceptedSecrets = getAcceptedSecrets();
  const incomingSecret = getIncomingSecret(request);

  if (acceptedSecrets.length === 0) {
    return NextResponse.json(
      { ok: false, error: "INTERNAL_SYNC_SECRET ou CRON_SECRET não configurada." },
      { status: 500 }
    );
  }

  if (!incomingSecret || !acceptedSecrets.includes(incomingSecret)) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }

  const secretForInternalCalls = getSecretForInternalCalls();

  const [meta, google] = await Promise.all([
    callInternalSync({
      request,
      secret: secretForInternalCalls,
      path: "/api/sync/meta?mode=realtime",
    }),
    callInternalSync({
      request,
      secret: secretForInternalCalls,
      path: "/api/sync/google?mode=realtime",
    }),
  ]);

  const ok = meta.ok && google.ok;

  return NextResponse.json(
    {
      ok,
      executedAt: new Date().toISOString(),
      results: {
        meta,
        google,
      },
    },
    { status: ok ? 200 : 500 }
  );
}

export async function GET(request: NextRequest) {
  return handleDailySync(request);
}

export async function POST(request: NextRequest) {
  return handleDailySync(request);
}
