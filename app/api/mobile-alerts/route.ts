// bac-hms/web/app/api/mobile-alerts/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const employeeId = (url.searchParams.get("employeeId") || "").trim();

    if (!employeeId) {
      return NextResponse.json(
        { error: "MISSING_EMPLOYEE_ID" },
        { status: 400 }
      );
    }

    const items = await prisma.mobileAlert.findMany({
      where: {
        employeeId,
        isRead: false,
        type: "SHIFT_CANCELLED",
      },
      orderBy: [
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        note: true,
        individualName: true,
        serviceName: true,
        shiftDateLabel: true,
        shiftTimeLabel: true,
        createdAt: true,
        shiftId: true,
      },
    });

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (err: any) {
    console.error("[mobile-alerts][GET] error:", err);

    return NextResponse.json(
      {
        error: "FAILED_TO_FETCH_MOBILE_ALERTS",
        detail: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}