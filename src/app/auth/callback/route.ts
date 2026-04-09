import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafeNextPath } from "@/lib/auth/utils";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = await createClient();

  const nextPath = getSafeNextPath(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const flow = url.searchParams.get("flow");

  // Fluxo PKCE
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const redirectUrl = new URL(nextPath, url.origin);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Fluxo recovery/invite por token_hash
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "recovery" | "invite" | "email",
    });

    if (!error) {
      const redirectUrl = new URL(nextPath, url.origin);

      if (flow) {
        redirectUrl.searchParams.set("flow", flow);
      }

      return NextResponse.redirect(redirectUrl);
    }
  }

  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set("error", "recovery");
  return NextResponse.redirect(loginUrl);
}