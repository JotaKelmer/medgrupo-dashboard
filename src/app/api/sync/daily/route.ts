import { NextResponse } from "next/server";
import { runGoogleSyncRequest } from "@/lib/sync/google-sync";
import { runMetaSyncRequest } from "@/lib/sync/meta-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function getIncomingSecret(request: Request) {
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

async function responseToResult(response: Response, path: string) {
  const data = await response.clone().json().catch(async () => {
    const text = await response.clone().text().catch(() => "");
    return text ? { raw: text } : {};
  });

  return {
    ok: response.ok,
    status: response.status,
    path,
    data,
  };
}

async function handleDailySync(request: Request) {
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

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()?.replace(/^(.+)$/, "https://$1") ||
    process.env.VERCEL_URL?.trim()?.replace(/^(.+)$/, "https://$1") ||
    "http://localhost:3000";

  const forwardedHeaders = new Headers(request.headers);

  const metaRequest = new Request(`${origin}/api/sync/meta?mode=realtime`, {
    method: "GET",
    headers: forwardedHeaders,
  });

  const googleRequest = new Request(`${origin}/api/sync/google?mode=realtime`, {
    method: "GET",
    headers: forwardedHeaders,
  });

  const [metaResponse, googleResponse] = await Promise.all([
    runMetaSyncRequest(metaRequest, { skipAuth: true }),
    runGoogleSyncRequest(googleRequest, { skipAuth: true }),
  ]);

  const [meta, google] = await Promise.all([
    responseToResult(metaResponse, "/api/sync/meta?mode=realtime"),
    responseToResult(googleResponse, "/api/sync/google?mode=realtime"),
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

export async function GET(request: Request) {
  return handleDailySync(request);
}

export async function POST(request: Request) {
  return handleDailySync(request);
}