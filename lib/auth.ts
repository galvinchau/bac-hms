// lib/auth.ts
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const AUTH_COOKIE = "bac_hms_auth";
const AUTH_SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";

export type AuthPayload = {
  userId: string;
  email: string;
  userType: string;
};

export function signAuthToken(payload: AuthPayload): string {
  return jwt.sign(payload, AUTH_SECRET, { expiresIn: "12h" });
}

export function verifyAuthToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, AUTH_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

/**
 * Server helper: lấy thông tin user hiện tại từ cookie.
 * Dùng được trong server components & API routes (không dùng trong middleware).
 */
export async function getCurrentUser() {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  const payload = verifyAuthToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      roles: { include: { role: true } },
      privileges: { include: { privilege: true } },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    userType: user.userType,
    roles: user.roles.map((r) => r.role.code),
    privileges: user.privileges.map((p) => p.privilege.code),
  };
}
