import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSafeNextPath } from "@/lib/auth/utils";

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

function getSupabaseKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

function buildRedirectResponse(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url));
}

export async function updateSession(request: NextRequest) {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  if (!url || !key) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;

  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isLoginRoute = pathname === "/login";
  const isForgotPasswordRoute = pathname === "/esqueci-minha-senha";
  const isResetPasswordRoute = pathname === "/reset-password";

  if (!user && isDashboardRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // IMPORTANTE:
  // não redirecionar /reset-password para /login.
  // No fluxo de recovery/invite, a sessão pode estar sendo criada
  // exatamente nesse momento via callback do Supabase.
  if (user && (isLoginRoute || isForgotPasswordRoute)) {
    const hasError = request.nextUrl.searchParams.has("error");

    // Se vier erro na URL, deixa a tela abrir e não empurra para dashboard.
    if (!hasError) {
      const nextPath = getSafeNextPath(request.nextUrl.searchParams.get("next"));
      return buildRedirectResponse(request, nextPath);
    }
  }

  // /reset-password deve permanecer acessível para o fluxo concluir
  if (isResetPasswordRoute) {
    return response;
  }

  return response;
}