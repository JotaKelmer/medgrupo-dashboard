import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSafeNextPath } from "@/lib/auth/utils";

type SupportedOtpType = "invite" | "magiclink" | "recovery";

function isSupportedOtpType(value: string | null): value is SupportedOtpType {
  return value === "invite" || value === "magiclink" || value === "recovery";
}

async function maybeActivatePendingMemberships(userId: string, enabled: boolean) {
  if (!enabled) {
    return;
  }

  const admin = getSupabaseAdmin();

  if (!admin) {
    return;
  }

  const { error } = await admin
    .from("workspace_members")
    .update({
      status: "active",
    })
    .eq("user_id", userId)
    .eq("status", "invited");

  if (error) {
    console.error(
      "Não foi possível ativar memberships pendentes após o callback:",
      error.message,
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const flow = url.searchParams.get("flow");
  const nextPath = getSafeNextPath(url.searchParams.get("next"));
  const shouldActivatePendingMemberships = flow === "invite" || type === "invite";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        await maybeActivatePendingMemberships(user.id, shouldActivatePendingMemberships);
      }

      return NextResponse.redirect(new URL(nextPath, url.origin));
    }
  }

  if (tokenHash && isSupportedOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        await maybeActivatePendingMemberships(user.id, shouldActivatePendingMemberships);
      }

      return NextResponse.redirect(new URL(nextPath, url.origin));
    }
  }

  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set("error", "recovery");
  loginUrl.searchParams.set("next", nextPath);

  return NextResponse.redirect(loginUrl);
}
