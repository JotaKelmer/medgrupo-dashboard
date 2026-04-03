import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const requestAny = request as any;
  const responseAny = new NextResponse() as any;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return requestAny.cookies?.getAll?.() ?? [];
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value, options }: any) => {
            responseAny.cookies?.set?.(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getUser();

  return responseAny;
}