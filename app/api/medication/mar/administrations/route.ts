// web/app/api/medication/mar/administrations/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = new Set([
  "SCHEDULED",
  "GIVEN",
  "REFUSED",
  "MISSED",
  "HELD",
  "LATE",
  "ERROR",
]);

function isValidStatus(x: any): x is
  | "SCHEDULED"
  | "GIVEN"
  | "REFUSED"
  | "MISSED"
  | "HELD"
  | "LATE"
  | "ERROR" {
  return typeof x === "string" && VALID_STATUSES.has(x);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const orderId = String(body?.orderId || "").trim();
    const individualId = String(body?.individualId || "").trim();
    const scheduledDateTimeIso = String(body?.scheduledDateTime || "").trim();

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }
    if (!individualId) {
      return NextResponse.json(
        { error: "Missing individualId" },
        { status: 400 },
      );
    }
    if (!scheduledDateTimeIso) {
      return NextResponse.json(
        { error: "Missing scheduledDateTime" },
        { status: 400 },
      );
    }

    const scheduledDateTime = new Date(scheduledDateTimeIso);
    if (Number.isNaN(scheduledDateTime.getTime())) {
      return NextResponse.json(
        { error: "Invalid scheduledDateTime" },
        { status: 400 },
      );
    }

    // status: allow null (generated rows)
    const rawStatus = body?.status ?? null;

    // Normalize: sometimes UI might send "Given" etc -> convert to UPPER if possible
    const normalizedStatus =
      typeof rawStatus === "string" ? rawStatus.trim().toUpperCase() : null;

    const status =
      normalizedStatus === null || normalizedStatus === ""
        ? null
        : isValidStatus(normalizedStatus)
          ? normalizedStatus
          : undefined;

    if (status === undefined) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const actualDateTimeIso = body?.actualDateTime
      ? String(body.actualDateTime).trim()
      : "";
    const actualDateTime = actualDateTimeIso
      ? new Date(actualDateTimeIso)
      : null;

    if (actualDateTime && Number.isNaN(actualDateTime.getTime())) {
      return NextResponse.json(
        { error: "Invalid actualDateTime" },
        { status: 400 },
      );
    }

    const reason = body?.reason ? String(body.reason) : null;
    const vitalsSummary = body?.vitalsSummary ? String(body.vitalsSummary) : null;

    // Optional: staffName/staffId (you can wire from auth later)
    const staffId = body?.staffId ? String(body.staffId) : null;
    const staffName = body?.staffName ? String(body.staffName) : null;

    // ✅ Upsert by compound unique: @@unique([orderId, scheduledDateTime])
    const saved = await prisma.medicationAdministration.upsert({
      where: {
        orderId_scheduledDateTime: {
          orderId,
          scheduledDateTime,
        },
      },
      update: {
        status,
        actualDateTime,
        reason,
        vitalsSummary,
        staffId,
        staffName,
      },
      create: {
        orderId,
        individualId,
        scheduledDateTime,
        status,
        actualDateTime,
        reason,
        vitalsSummary,
        staffId,
        staffName,
      },
    });

    return NextResponse.json({ ok: true, item: saved }, { status: 200 });
  } catch (err: any) {
    console.error("POST /api/medication/mar/administrations error:", err);
    return NextResponse.json(
      { error: "Internal error", details: String(err?.message || err) },
      { status: 500 },
    );
  }
}