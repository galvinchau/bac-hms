// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { setSessionCookie } from "@/lib/auth/session";

type LoginBody = {
  username?: string; // email nhập từ form
  password?: string;
};

function hashPasswordPBKDF2(password: string, salt: string) {
  const iterations = 120000;
  const keylen = 32;
  const digest = "sha256";
  const hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest);
  return hash.toString("hex");
}

function hashPasswordHmacSha256(password: string, salt: string) {
  return crypto.createHmac("sha256", salt).update(password).digest("hex");
}

function verifyPassword(
  plain: string,
  salt: string,
  storedHash: string
): boolean {
  const pbkdf2 = hashPasswordPBKDF2(plain, salt);
  if (pbkdf2 === storedHash) return true;

  const hmac = hashPasswordHmacSha256(plain, salt);
  if (hmac === storedHash) return true;

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LoginBody;

    const email = (body.username ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing username or password." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        userType: true,
        locked: true,
        passwordHash: true,
        passwordSalt: true,
        mustChangePassword: true,
      },
    });

    if (!user || user.locked) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    if (!user.passwordHash || !user.passwordSalt) {
      return NextResponse.json(
        { error: "Account has no password set. Please contact admin." },
        { status: 401 }
      );
    }

    const ok = verifyPassword(password, user.passwordSalt, user.passwordHash);

    if (!ok) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // ✅ create session cookie
    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        mustChangePassword: !!user.mustChangePassword,
      },
    });

    setSessionCookie(res, {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType,
    });

    return res;
  } catch (err) {
    console.error("POST /api/auth/login error:", err);
    return NextResponse.json({ error: "Unable to sign in." }, { status: 500 });
  }
}
