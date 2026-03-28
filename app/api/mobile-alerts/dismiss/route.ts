// bac-hms/web/app/api/mobile-alerts/dismiss/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const body = rawBody && typeof rawBody === "object" ? rawBody : {};

    const alertId = String((body as any)?.alertId || "").trim();

    if (!alertId) {
      return NextResponse.json(
        { error: "MISSING_ALERT_ID" },
        { status: 400 }
      );
    }

    const existing = await prisma.mobileAlert.findUnique({
      where: { id: alertId },
      select: {
        id: true,
        isRead: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "ALERT_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (existing.isRead) {
      return NextResponse.json({
        ok: true,
        alreadyDismissed: true,
      });
    }

    const updated = await prisma.mobileAlert.update({
      where: { id: alertId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      select: {
        id: true,
        isRead: true,
        readAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      item: updated,
    });
  } catch (err: any) {
    console.error("[mobile-alerts][dismiss][POST] error:", err);

    return NextResponse.json(
      {
        error: "FAILED_TO_DISMISS_MOBILE_ALERT",
        detail: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}