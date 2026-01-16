// lib/auth/session.ts
import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "bac_session";

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: string; // "ADMIN" | "COORDINATOR" | "DSP" ...
};

type SessionPayload = {
  user: SessionUser;
};

export function getSessionFromRequest(req: NextRequest): SessionUser | null {
  const raw = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SessionPayload;
    if (!parsed.user || !parsed.user.id) return null;
    return parsed.user;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: NextResponse, user: SessionUser) {
  const payload: SessionPayload = { user };

  // ✅ IMPORTANT:
  // - localhost uses http => secure cookie will NOT be stored
  // - production uses https => secure should be true
  const isProd = process.env.NODE_ENV === "production";

  res.cookies.set(SESSION_COOKIE_NAME, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 60 * 60 * 8, // 8 giờ
  });
}

export function clearSessionCookie(res: NextResponse) {
  const isProd = process.env.NODE_ENV === "production";

  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    expires: new Date(0),
  });
}
