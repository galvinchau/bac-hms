// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { setSessionCookie } from "@/lib/auth/session";

type LoginBody = {
  username?: string; // email nhập từ form
  password?: string;
};

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
      },
    });

    // Không tìm thấy user hoặc bị lock
    if (!user || user.locked) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Chưa từng đặt mật khẩu (chưa dùng màn Change password)
    if (!user.passwordHash || !user.passwordSalt) {
      return NextResponse.json(
        { error: "Account has no password set. Please contact admin." },
        { status: 401 }
      );
    }

    // Hash mật khẩu nhập vào theo ĐÚNG cách của Change Password:
    // hash = HMAC-SHA256( salt, plainPassword )
    const computedHash = crypto
      .createHmac("sha256", user.passwordSalt)
      .update(password)
      .digest("hex");

    if (computedHash !== user.passwordHash) {
      // sai mật khẩu
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Đúng mật khẩu → tạo cookie phiên đăng nhập
    const res = NextResponse.json({
      ok: true,
      user: {
        id:       user.id,
        email:    user.email,
        firstName:user.firstName,
        lastName: user.lastName,
        userType: user.userType,
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
    return NextResponse.json(
      { error: "Unable to sign in." },
      { status: 500 }
    );
  }
}
