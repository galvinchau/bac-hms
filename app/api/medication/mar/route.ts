import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isMissingTableError(err: any) {
  if (!err) return false;
  const msg = String(err.message ?? err);
  return (
    msg.includes("does not exist") &&
    (msg.includes("MedicationOrder") ||
      msg.includes("MedicationAdministration"))
  );
}

/**
 * GET /api/medication/mar?individualId=...&month=YYYY-MM
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const individualId = searchParams.get("individualId");
    const month = searchParams.get("month"); // "2024-11"

    if (!individualId) {
      return NextResponse.json(
        { error: "Missing required query param: individualId" },
        { status: 400 }
      );
    }

    const now = new Date();
    const monthValue =
      month ??
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [yearStr, monthStr] = monthValue.split("-");
    const year = Number(yearStr);
    const monthNum = Number(monthStr);

    if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
      return NextResponse.json(
        { error: "Invalid month format. Expected YYYY-MM." },
        { status: 400 }
      );
    }

    const startOfMonth = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
    const startOfNextMonth = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0));

    const orders = await prisma.medicationOrder.findMany({
      where: {
        individualId,
        status: "ACTIVE" as any,
        startDate: { lt: startOfNextMonth },
        OR: [{ endDate: null }, { endDate: { gte: startOfMonth } }],
      },
      orderBy: [{ medicationName: "asc" }, { startDate: "asc" }],
    });

    const administrations = await prisma.medicationAdministration.findMany({
      where: {
        individualId,
        scheduledDateTime: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
      },
      orderBy: { scheduledDateTime: "asc" },
    });

    return NextResponse.json(
      { month: monthValue, individualId, orders, administrations },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[GET /api/medication/mar] Error:", err);

    // ⚠️ Nếu chưa tạo bảng Medication*, trả về data rỗng cho phép FE tiếp tục chạy
    if (isMissingTableError(err)) {
      return NextResponse.json(
        {
          month: null,
          individualId: null,
          orders: [],
          administrations: [],
          warning:
            "Medication tables not created yet. Returning empty MAR data.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to load MAR data.",
        errorDetail: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/medication/mar
 * (tạm thời nếu chưa có bảng sẽ trả 400, tránh crash)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      id,
      orderId,
      individualId: individualIdFromBody,
      scheduledDateTime,
      actualDateTime,
      status,
      reason,
      vitalsSummary,
      staffId,
      staffName,
    } = body ?? {};

    if (!orderId || !scheduledDateTime || !status) {
      return NextResponse.json(
        {
          error:
            "Missing required fields. Required: orderId, scheduledDateTime, status.",
        },
        { status: 400 }
      );
    }

    const order = await prisma.medicationOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: "MedicationOrder not found." },
        { status: 404 }
      );
    }

    const individualId = individualIdFromBody ?? order.individualId;

    const scheduled = new Date(scheduledDateTime);
    if (Number.isNaN(scheduled.getTime())) {
      return NextResponse.json(
        { error: "Invalid scheduledDateTime. Must be ISO string." },
        { status: 400 }
      );
    }

    const actual =
      actualDateTime != null ? new Date(actualDateTime) : undefined;
    if (actualDateTime && Number.isNaN(actual?.getTime() ?? NaN)) {
      return NextResponse.json(
        { error: "Invalid actualDateTime. Must be ISO string." },
        { status: 400 }
      );
    }

    const validStatuses = [
      "GIVEN",
      "REFUSED",
      "MISSED",
      "HELD",
      "LATE",
      "ERROR",
    ] as const;

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    const data = {
      orderId,
      individualId,
      scheduledDateTime: scheduled,
      actualDateTime: actual ?? null,
      status: status as any,
      reason: reason ?? null,
      vitalsSummary: vitalsSummary ?? null,
      staffId: staffId ?? null,
      staffName: staffName ?? null,
    };

    let admin;

    if (id) {
      admin = await prisma.medicationAdministration.update({
        where: { id },
        data,
      });
    } else {
      admin = await prisma.medicationAdministration.create({
        data,
      });
    }

    return NextResponse.json(admin, { status: 200 });
  } catch (err: any) {
    console.error("[POST /api/medication/mar] Error:", err);

    if (isMissingTableError(err)) {
      return NextResponse.json(
        {
          error:
            "Medication tables not created yet. Please run DB migration before saving MAR.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to save MAR record.",
        errorDetail: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
