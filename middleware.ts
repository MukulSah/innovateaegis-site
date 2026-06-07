import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SAI_AUTH_COOKIE } from "@/lib/sai/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedApi =
    pathname.startsWith("/api/sai/") && !pathname.startsWith("/api/sai/login");

  if (pathname.startsWith("/sai") || isProtectedApi) {
    const auth = request.cookies.get(SAI_AUTH_COOKIE)?.value;

    if (auth !== "authenticated") {
      if (isProtectedApi) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === "/login") {
    const auth = request.cookies.get(SAI_AUTH_COOKIE)?.value;

    if (auth === "authenticated") {
      return NextResponse.redirect(new URL("/sai", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/sai/:path*", "/login"],
};
