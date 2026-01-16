// app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendHmsWelcomeEmail } from "@/lib/mailer";

function generateTempPassword(len = 12) {
  // ✅ Recommend: only letters+numbers to avoid copy/paste issues
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function makeSalt(bytes = 16) {
  return crypto.randomBytes(bytes).toString("hex");
}

function hashPasswordHmacSha256(password: string, salt: string) {
  // ✅ MUST match login verifier:
  // hash = HMAC-SHA256( salt, plainPassword )
  return crypto.createHmac("sha256", salt).update(password).digest("hex");
}

// ===== GET: list all users for Manage Users page =====
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { email: "asc" },
      include: {
        roles: { include: { role: true } },
      },
    });

    const payload = users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      locked: u.locked,
      userType: u.userType,
      roles: u.roles.map((ur) => ur.role.code),
    }));

    return NextResponse.json(payload);
  } catch (err) {
    console.error("GET /api/admin/users error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// ===== POST: create new user from Create User screen =====
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      email,
      firstName,
      lastName,
      locked,
      userType,
      roleIds,
      privilegeIds,
      supervisorIds,
    } = body;

    const normalizedEmail = String(email ?? "")
      .trim()
      .toLowerCase();

    if (!normalizedEmail || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This email/username already exists." },
        { status: 400 }
      );
    }

    // ✅ Generate temp password + salt + hash (HMAC - matches login)
    const tempPassword = generateTempPassword(12);
    const salt = makeSalt(16);
    const hash = hashPasswordHmacSha256(tempPassword, salt);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        firstName,
        lastName,
        locked: !!locked,
        userType,

        passwordSalt: salt,
        passwordHash: hash,
        passwordUpdatedAt: new Date(),

        mustChangePassword: true,
      },
    });

    if (Array.isArray(roleIds) && roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map((roleId: string) => ({
          userId: user.id,
          roleId,
        })),
      });
    }

    if (Array.isArray(privilegeIds) && privilegeIds.length > 0) {
      await prisma.userPrivilege.createMany({
        data: privilegeIds.map((privilegeId: string) => ({
          userId: user.id,
          privilegeId,
        })),
      });
    }

    if (Array.isArray(supervisorIds) && supervisorIds.length > 0) {
      await prisma.userSupervisor.createMany({
        data: supervisorIds.map((supervisorId: string) => ({
          userId: user.id,
          supervisorId,
        })),
      });
    }

    // ✅ Send welcome email (do not block creation if SMTP fails)
    sendHmsWelcomeEmail({
      email: normalizedEmail,
      firstName,
      lastName,
      tempPassword,
    }).catch((e) => console.error("[mail] HMS welcome email error:", e));

    return NextResponse.json({ success: true, id: user.id });
  } catch (err) {
    console.error("POST /api/admin/users error:", err);
    return NextResponse.json(
      { error: "Failed to create user." },
      { status: 500 }
    );
  }
}
