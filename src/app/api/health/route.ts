import { NextResponse } from "next/server";
import { hasSupabaseConfig, shouldUseMocks } from "@/lib/supabase/admin";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    mode: shouldUseMocks() ? "mock" : "supabase",
    hasSupabaseConfig: hasSupabaseConfig(),
    timestamp: new Date().toISOString()
  });
}
