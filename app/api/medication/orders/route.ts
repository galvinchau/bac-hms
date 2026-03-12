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

function toNullableString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function toNullableFloat(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toNullableInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
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

    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          orders: [],
          warning:
            "Medication tables not created yet (MedicationOrder). Please update DB schema for MedicationOrder.",
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
      strengthText,
      doseAmount,
      doseValue,
      doseUnit,
      route,
      type,
      frequencyText,
      timesOfDay,
      startDate,
      endDate,
      daysSupply,
      refills,
      prescriberName,
      pharmacyName,
      directionsSig,
      prnReason,
      specialInstructions,
      indications,
      allergyFlag,
      status,
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

    const parsedDoseValue = Number(doseValue);
    if (!Number.isFinite(parsedDoseValue) || parsedDoseValue <= 0) {
      return NextResponse.json(
        { error: "Invalid doseValue. Must be a number greater than 0." },
        { status: 400 },
      );
    }

    const parsedDoseAmount = toNullableFloat(doseAmount);
    if (doseAmount != null && doseAmount !== "" && parsedDoseAmount == null) {
      return NextResponse.json(
        { error: "Invalid doseAmount. Must be a valid number." },
        { status: 400 },
      );
    }

    const parsedDaysSupply = toNullableInt(daysSupply);
    if (daysSupply != null && daysSupply !== "" && parsedDaysSupply == null) {
      return NextResponse.json(
        { error: "Invalid daysSupply. Must be a whole number." },
        { status: 400 },
      );
    }

    const parsedRefills = toNullableInt(refills);
    if (refills != null && refills !== "" && parsedRefills == null) {
      return NextResponse.json(
        { error: "Invalid refills. Must be a whole number." },
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

    const normalizedTimesOfDay = Array.isArray(timesOfDay)
      ? timesOfDay
          .map((x) => String(x ?? "").trim())
          .filter(Boolean)
      : [];

    const newOrder = await prisma.medicationOrder.create({
      data: {
        individualId: String(individualId).trim(),
        medicationName: String(medicationName).trim(),
        form: toNullableString(form),
        strengthText: toNullableString(strengthText),
        doseAmount: parsedDoseAmount,
        doseValue: parsedDoseValue,
        doseUnit: String(doseUnit).trim(),
        route: toNullableString(route),
        type: type ?? "SCHEDULED",
        frequencyText: toNullableString(frequencyText),
        timesOfDay: normalizedTimesOfDay,
        startDate: start,
        endDate: end,
        daysSupply: parsedDaysSupply,
        refills: parsedRefills,
        prescriberName: toNullableString(prescriberName),
        pharmacyName: toNullableString(pharmacyName),
        directionsSig: toNullableString(directionsSig),
        prnReason: toNullableString(prnReason),
        specialInstructions: toNullableString(specialInstructions),
        indications: toNullableString(indications),
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
            "Medication tables not updated yet (MedicationOrder). Please update DB schema first.",
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

//
// ============================
// PATCH /api/medication/orders
// Update existing order
// ============================
//
export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    const {
      id,
      medicationName,
      form,
      strengthText,
      doseAmount,
      doseValue,
      doseUnit,
      route,
      type,
      frequencyText,
      timesOfDay,
      startDate,
      endDate,
      daysSupply,
      refills,
      prescriberName,
      pharmacyName,
      directionsSig,
      prnReason,
      specialInstructions,
      indications,
      allergyFlag,
      status,
    } = body ?? {};

    if (!id) {
      return NextResponse.json(
        { error: "Missing required field: id." },
        { status: 400 },
      );
    }

    if (!medicationName || doseValue == null || !doseUnit) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (medicationName, doseValue, doseUnit).",
        },
        { status: 400 },
      );
    }

    const parsedDoseValue = Number(doseValue);
    if (!Number.isFinite(parsedDoseValue) || parsedDoseValue <= 0) {
      return NextResponse.json(
        { error: "Invalid doseValue. Must be a number greater than 0." },
        { status: 400 },
      );
    }

    const parsedDoseAmount = toNullableFloat(doseAmount);
    if (doseAmount != null && doseAmount !== "" && parsedDoseAmount == null) {
      return NextResponse.json(
        { error: "Invalid doseAmount. Must be a valid number." },
        { status: 400 },
      );
    }

    const parsedDaysSupply = toNullableInt(daysSupply);
    if (daysSupply != null && daysSupply !== "" && parsedDaysSupply == null) {
      return NextResponse.json(
        { error: "Invalid daysSupply. Must be a whole number." },
        { status: 400 },
      );
    }

    const parsedRefills = toNullableInt(refills);
    if (refills != null && refills !== "" && parsedRefills == null) {
      return NextResponse.json(
        { error: "Invalid refills. Must be a whole number." },
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

    const normalizedTimesOfDay = Array.isArray(timesOfDay)
      ? timesOfDay
          .map((x) => String(x ?? "").trim())
          .filter(Boolean)
      : [];

    const existing = await prisma.medicationOrder.findUnique({
      where: { id: String(id) },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Medication order not found." },
        { status: 404 },
      );
    }

    const updatedOrder = await prisma.medicationOrder.update({
      where: { id: String(id) },
      data: {
        medicationName: String(medicationName).trim(),
        form: toNullableString(form),
        strengthText: toNullableString(strengthText),
        doseAmount: parsedDoseAmount,
        doseValue: parsedDoseValue,
        doseUnit: String(doseUnit).trim(),
        route: toNullableString(route),
        type: type ?? "SCHEDULED",
        frequencyText: toNullableString(frequencyText),
        timesOfDay: normalizedTimesOfDay,
        startDate: start,
        endDate: end,
        daysSupply: parsedDaysSupply,
        refills: parsedRefills,
        prescriberName: toNullableString(prescriberName),
        pharmacyName: toNullableString(pharmacyName),
        directionsSig: toNullableString(directionsSig),
        prnReason: toNullableString(prnReason),
        specialInstructions: toNullableString(specialInstructions),
        indications: toNullableString(indications),
        allergyFlag: Boolean(allergyFlag ?? false),
        status: status ?? "ACTIVE",
      },
    });

    return NextResponse.json({ order: updatedOrder }, { status: 200 });
  } catch (error: any) {
    console.error("[PATCH /api/medication/orders] error:", error);

    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          error:
            "Medication tables not updated yet (MedicationOrder). Please update DB schema first.",
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

//
// ============================
// DELETE /api/medication/orders?id=...
// Delete existing order
// ============================
//
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = (searchParams.get("id") || "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Missing required query param: id." },
        { status: 400 },
      );
    }

    const existing = await prisma.medicationOrder.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Medication order not found." },
        { status: 404 },
      );
    }

    await prisma.medicationOrder.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true, id }, { status: 200 });
  } catch (error: any) {
    console.error("[DELETE /api/medication/orders] error:", error);

    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          error:
            "Medication tables not updated yet (MedicationOrder). Please update DB schema first.",
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