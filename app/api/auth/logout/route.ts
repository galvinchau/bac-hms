// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
