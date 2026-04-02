import { runGoogleSyncRequest } from "@/lib/sync/google-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  return runGoogleSyncRequest(request);
}

export async function POST(request: Request) {
  return runGoogleSyncRequest(request);
}
