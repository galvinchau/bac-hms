// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "./lib/auth/session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static, _next, and all API routes (API returns 401 itself)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // Public pages
  if (pathname === "/login") {
    const user = getSessionFromRequest(req);
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Require session for all other pages
  const user = getSessionFromRequest(req);
  if (!user) {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // ✅ ADMIN-only areas (block direct URL access)
  const adminOnlyPrefixes = ["/admin", "/payroll", "/billing"];
  if (
    adminOnlyPrefixes.some((p) => pathname.startsWith(p)) &&
    user.userType !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

// Apply to all routes except static assets
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
