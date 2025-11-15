// app/api/admin/password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

type Body = {
  email: string;
  newPassword: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;
    const email = body.email?.trim().toLowerCase();
    const newPassword = body.newPassword ?? "";

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: "Email and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Tạo salt + hash với SHA-256 (đơn giản, đủ dùng nội bộ)
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .createHmac("sha256", salt)
      .update(newPassword)
      .digest("hex");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordSalt: salt,
        passwordHash: hash,
        passwordUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Change password error", err);
    return NextResponse.json(
      { error: "Failed to change password." },
      { status: 500 }
    );
  }
}
