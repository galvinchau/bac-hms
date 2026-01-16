// web/app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// ✅ PBKDF2 (new/standard)
function hashPBKDF2(password: string, salt: string) {
  const iterations = 120000;
  const keylen = 32;
  const digest = "sha256";
  return crypto
    .pbkdf2Sync(password, salt, iterations, keylen, digest)
    .toString("hex");
}

// ✅ HMAC (legacy - some existing users may still be on this)
function hashHmacSha256(password: string, salt: string) {
  return crypto.createHmac("sha256", salt).update(password).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = (body?.email ?? "").trim().toLowerCase();
    const currentPassword = body?.currentPassword ?? "";
    const newPassword = body?.newPassword ?? "";

    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json(
        {
          error: "Missing required fields.",
          debug: {
            hasEmail: !!email,
            hasCurrent: !!currentPassword,
            hasNew: !!newPassword,
          },
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordSalt: true,
        passwordHash: true,
      },
    });

    if (!user || !user.passwordSalt || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // ✅ Compute both hashes (PBKDF2 + legacy HMAC)
    const pbk = hashPBKDF2(currentPassword, user.passwordSalt);
    const hmac = hashHmacSha256(currentPassword, user.passwordSalt);

    const ok = pbk === user.passwordHash || hmac === user.passwordHash;

    if (!ok) {
      return NextResponse.json(
        {
          error: "Invalid username or password.",
          debug: {
            reason: "current_password_hash_mismatch",
            email,
            saltLen: user.passwordSalt.length,
            storedHashLen: user.passwordHash.length,
            storedHashPrefix: user.passwordHash.slice(0, 8),
            pbkPrefix: pbk.slice(0, 8),
            hmacPrefix: hmac.slice(0, 8),
          },
        },
        { status: 401 }
      );
    }

    // ✅ Always re-save using PBKDF2 (standardize forward)
    const newSalt = crypto.randomBytes(16).toString("hex");
    const newHash = hashPBKDF2(newPassword, newSalt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordSalt: newSalt,
        passwordHash: newHash,
        mustChangePassword: false,
        passwordUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/change-password error:", err);
    return NextResponse.json(
      { error: "Unable to change password." },
      { status: 500 }
    );
  }
}
