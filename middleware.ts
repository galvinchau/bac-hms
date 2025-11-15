// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/favicon.ico"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Cho qua các path public
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return NextResponse.next();
  }

  // Cho qua static assets
  if (pathname.startsWith("/_next") || pathname.startsWith("/public")) {
    return NextResponse.next();
  }

  // Các request còn lại: cần cookie đăng nhập
  const userId = req.cookies.get("hms_user_id")?.value;

  if (!userId) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname || "/");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Áp dụng cho toàn site trừ static
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
