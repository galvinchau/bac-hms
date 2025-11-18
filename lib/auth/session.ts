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

  res.cookies.set(SESSION_COOKIE_NAME, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 8, // 8 giờ
  });
}

export function clearSessionCookie(res: NextResponse) {
  // xoá cookie
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    expires: new Date(0),
  });
}
