// web/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * TEMP: Disable auth redirects on production.
 * Allow all requests to go through without checking login.
 * We will implement real authentication later.
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

// Apply middleware to all routes except Next.js assets
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
