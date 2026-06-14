import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveHeadquartersLegacyRedirect } from "@/lib/sai/headquarters";

const AUTH_ROUTES = ["/auth/login", "/auth/register", "/auth/forgot-password"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { pathname, search } = request.nextUrl;
  const legacyRedirect = resolveHeadquartersLegacyRedirect(pathname);
  if (legacyRedirect) {
    const target = new URL(legacyRedirect, request.url);
    if (search && !legacyRedirect.includes("?")) {
      target.search = search;
    }
    return NextResponse.redirect(target);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isLegacyLogin = pathname === "/login";

  if (pathname.startsWith("/sai") && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if ((isAuthRoute || isLegacyLogin) && user) {
    return NextResponse.redirect(new URL("/sai", request.url));
  }

  if (isLegacyLogin && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.searchParams.get("redirect") ?? "/sai");
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/sai/:path*", "/auth/:path*", "/login"],
};
