import { runMetaSyncRequest } from "@/lib/sync/meta-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  return runMetaSyncRequest(request);
}

export async function POST(request: Request) {
  return runMetaSyncRequest(request);
}
