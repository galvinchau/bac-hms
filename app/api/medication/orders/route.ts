// Web/app/api/medication/orders/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isMissingTableError(err: any) {
  if (!err) return false;
  if (err?.code === "P2021") return true; // Prisma: table does not exist
  const msg = String(err?.message || err).toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("relation") ||
    msg.includes("table")
  );
}

//
// ============================
// GET /api/medication/orders?individualId=...
// ============================
//
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const individualId = (searchParams.get("individualId") || "").trim();

    if (!individualId) {
      return NextResponse.json(
        { orders: [], error: "Missing individualId" },
        { status: 400 },
      );
    }

    const orders = await prisma.medicationOrder.findMany({
      where: { individualId },
      orderBy: [{ medicationName: "asc" }],
    });

    return NextResponse.json({ orders }, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/medication/orders] error:", error);

    // If DB tables not created yet, return warning so UI can fall back (or show empty gracefully)
    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          orders: [],
          warning:
            "Medication tables not created yet (MedicationOrder). Please run Prisma migration for web DB.",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { orders: [], error: error?.message || "Server error" },
      { status: 500 },
    );
  }
}

//
// ============================
// POST /api/medication/orders
// ============================
//
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      individualId,
      medicationName,
      form,
      doseValue,
      doseUnit,
      route,
      type,
      frequencyText,
      timesOfDay,
      startDate,
      endDate,
      prescriberName,
      pharmacyName,
      indications,
      allergyFlag,
      status, // optional
    } = body ?? {};

    if (!individualId || !medicationName || doseValue == null || !doseUnit) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (individualId, medicationName, doseValue, doseUnit).",
        },
        { status: 400 },
      );
    }

    const start = new Date(startDate);
    if (!startDate || Number.isNaN(start.getTime())) {
      return NextResponse.json(
        { error: "Invalid startDate. Must be ISO string or date-like value." },
        { status: 400 },
      );
    }

    const end = endDate ? new Date(endDate) : null;
    if (endDate && Number.isNaN(end?.getTime() ?? NaN)) {
      return NextResponse.json(
        { error: "Invalid endDate. Must be ISO string or date-like value." },
        { status: 400 },
      );
    }

    const newOrder = await prisma.medicationOrder.create({
      data: {
        individualId,
        medicationName,
        form: form ?? null,
        doseValue: Number(doseValue),
        doseUnit,
        route: route ?? null,
        type: type ?? "SCHEDULED",
        frequencyText: frequencyText ?? null,
        timesOfDay: Array.isArray(timesOfDay) ? timesOfDay : [],
        startDate: start,
        endDate: end,
        prescriberName: prescriberName ?? null,
        pharmacyName: pharmacyName ?? null,
        indications: indications ?? null,
        allergyFlag: Boolean(allergyFlag ?? false),
        status: status ?? "ACTIVE",
      },
    });

    return NextResponse.json({ order: newOrder }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/medication/orders] error:", error);

    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          error:
            "Medication tables not created yet (MedicationOrder). Please run Prisma migration for web DB.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error?.message || "Server error" },
      { status: 500 },
    );
  }
}
