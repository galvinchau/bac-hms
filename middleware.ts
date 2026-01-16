// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "./lib/auth/session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  if (pathname === "/login") {
    const user = getSessionFromRequest(req);
    if (user) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }

  const user = getSessionFromRequest(req);
  if (!user) {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // ✅ Allow any logged-in user to access change password page
  if (pathname.startsWith("/admin/change-password")) {
    return NextResponse.next();
  }

  const adminOnlyPrefixes = ["/admin", "/payroll", "/billing"];
  if (
    adminOnlyPrefixes.some((p) => pathname.startsWith(p)) &&
    user.userType !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
