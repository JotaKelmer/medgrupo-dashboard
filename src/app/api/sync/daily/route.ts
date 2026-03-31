import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function getSecret(request: NextRequest) {
  return request.headers.get("x-sync-secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
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

export async function GET(request: NextRequest) {
  const expectedSecret = process.env.INTERNAL_SYNC_SECRET?.trim();
  const incomingSecret = getSecret(request);

  if (!expectedSecret) {
    return NextResponse.json({ ok: false, error: "INTERNAL_SYNC_SECRET não configurada." }, { status: 500 });
  }

  if (incomingSecret !== expectedSecret) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }

  const meta = await callInternalSync({
    request,
    secret: expectedSecret,
    path: "/api/sync/meta?mode=realtime&syncAds=1",
  });

  const google = await callInternalSync({
    request,
    secret: expectedSecret,
    path: "/api/sync/google",
  });

  return NextResponse.json({
    ok: meta.ok && google.ok,
    executedAt: new Date().toISOString(),
    results: {
      meta,
      google,
    },
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
