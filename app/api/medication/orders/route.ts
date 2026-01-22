import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

// GET /api/medication/orders?individualId=...&status=ACTIVE (optional)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const individualId = (searchParams.get("individualId") || "").trim();
  const status = (searchParams.get("status") || "").trim(); // ACTIVE | ON_HOLD | DISCONTINUED
  const q = (searchParams.get("q") || "").trim();

  if (!individualId) return bad("Missing individualId");

  const where: any = {
    individualId,
  };

  if (status) where.status = status;
  if (q) {
    where.OR = [
      { medicationName: { contains: q, mode: "insensitive" } },
      { prescriberName: { contains: q, mode: "insensitive" } },
      { pharmacyName: { contains: q, mode: "insensitive" } },
    ];
  }

  const items = await prisma.medicationOrder.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    take: 500,
  });

  return NextResponse.json({ ok: true, items });
}

// POST /api/medication/orders
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON");

  const individualId = String(body.individualId || "").trim();
  const medicationName = String(body.medicationName || "").trim();
  const doseUnit = String(body.doseUnit || "").trim();
  const type = String(body.type || "").trim(); // SCHEDULED | PRN
  const status = String(body.status || "ACTIVE").trim(); // ACTIVE | ON_HOLD | DISCONTINUED
  const startDate = body.startDate ? new Date(body.startDate) : null;
  const endDate = body.endDate ? new Date(body.endDate) : null;

  const doseValueRaw = body.doseValue;
  const doseValue =
    typeof doseValueRaw === "number" ? doseValueRaw : Number(doseValueRaw);

  const timesOfDayRaw = Array.isArray(body.timesOfDay) ? body.timesOfDay : [];
  const timesOfDay = timesOfDayRaw
    .map((x: any) => String(x).trim())
    .filter(Boolean);

  if (!individualId) return bad("Individual is required");
  if (!medicationName) return bad("Medication name is required");
  if (!Number.isFinite(doseValue)) return bad("Dose value must be a number");
  if (!doseUnit) return bad("Dose unit is required");
  if (type !== "SCHEDULED" && type !== "PRN")
    return bad("Type must be SCHEDULED or PRN");
  if (!startDate || Number.isNaN(startDate.getTime()))
    return bad("Start date is required");

  if (type === "SCHEDULED" && timesOfDay.length === 0) {
    return bad("Times of day is required for SCHEDULED medications");
  }

  // ensure Individual exists (nice error)
  const ind = await prisma.individual.findUnique({
    where: { id: individualId },
    select: { id: true },
  });
  if (!ind) return bad("Individual not found");

  const created = await prisma.medicationOrder.create({
    data: {
      individualId,
      medicationName,
      form: body.form ? String(body.form).trim() : null,
      doseValue,
      doseUnit,
      route: body.route ? String(body.route).trim() : null,

      type,
      frequencyText: body.frequencyText
        ? String(body.frequencyText).trim()
        : null,
      timesOfDay,

      startDate,
      endDate: endDate && !Number.isNaN(endDate.getTime()) ? endDate : null,

      status,
      prescriberName: body.prescriberName
        ? String(body.prescriberName).trim()
        : null,
      pharmacyName: body.pharmacyName ? String(body.pharmacyName).trim() : null,
      indications: body.indications ? String(body.indications).trim() : null,
      allergyFlag: Boolean(body.allergyFlag),
    },
  });

  return NextResponse.json({ ok: true, item: created });
}
