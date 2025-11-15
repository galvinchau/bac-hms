// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "bac_hms_auth";

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true });

  // Xoá cookie auth
  res.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
