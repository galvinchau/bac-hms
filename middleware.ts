// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "./lib/auth/session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bỏ qua static, _next, tất cả API (để API tự trả 401, không redirect)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // Các trang public (chỉ có /login)
  if (pathname === "/login") {
    const user = getSessionFromRequest(req);
    // Đã đăng nhập mà vẫn vào /login thì đẩy về dashboard
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Các trang còn lại: yêu cầu phải có session
  const user = getSessionFromRequest(req);
  if (!user) {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Chặn /admin/** nếu không phải ADMIN
  if (pathname.startsWith("/admin") && user.userType !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

// Áp dụng cho mọi route trừ static/_next (đã lọc ở trên)
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
