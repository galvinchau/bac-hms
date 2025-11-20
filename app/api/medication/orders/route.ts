import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

//
// ============================
// GET /api/medication/orders
// ============================
//
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const individualId = searchParams.get("individualId");

    if (!individualId) {
      return NextResponse.json(
        { error: "Missing individualId" },
        { status: 400 }
      );
    }

    const orders = await prisma.medicationOrder.findMany({
      where: { individualId },
      orderBy: [{ medicationName: "asc" }],
    });

    // 👈 Trả về đúng key "orders" cho FE
    return NextResponse.json({ orders }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/medication/orders >", error);
    return NextResponse.json(
      { error: error?.message || "Server error" },
      { status: 500 }
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
    } = body ?? {};

    if (!individualId || !medicationName || !doseValue || !doseUnit) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newOrder = await prisma.medicationOrder.create({
      data: {
        individualId,
        medicationName,
        form,
        doseValue,
        doseUnit,
        route,
        type,
        frequencyText,
        timesOfDay,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        prescriberName,
        pharmacyName,
        indications,
        allergyFlag: allergyFlag ?? false,
      },
    });

    // Trả về order mới tạo
    return NextResponse.json({ order: newOrder }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/medication/orders ->", error);
    return NextResponse.json(
      { error: error?.message || "Server error" },
      { status: 500 }
    );
  }
}
