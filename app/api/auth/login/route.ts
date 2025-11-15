// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

type Body = {
  email: string;
  password: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // Tìm user theo email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordSalt || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Tính hash từ password nhập vào + salt đã lưu
    const candidateHash = crypto
      .createHmac("sha256", user.passwordSalt)
      .update(password)
      .digest("hex");

    if (candidateHash !== user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // ✅ Đúng mật khẩu -> set cookie phiên đăng nhập
    const res = NextResponse.json({ ok: true });

    res.cookies.set("hms_user_id", user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 giờ
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch (err) {
    console.error("Login error", err);
    return NextResponse.json({ error: "Failed to sign in." }, { status: 500 });
  }
}
