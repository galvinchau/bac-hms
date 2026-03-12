import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isMissingTableError(err: any) {
  if (!err) return false;
  if (err?.code === "P2021") return true;

  const msg = String(err?.message || err).toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("relation") ||
    msg.includes("table")
  );
}

function buildIndividualName(individual: {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  code?: string | null;
} | null | undefined) {
  if (!individual) return "Individual";

  const fullName = [
    individual.firstName,
    individual.middleName,
    individual.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || individual.code || "Individual";
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const orderId = String(id || "").trim();

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing order id." },
        { status: 400 },
      );
    }

    const order = await prisma.medicationOrder.findUnique({
      where: { id: orderId },
      include: {
        individual: {
          select: {
            id: true,
            code: true,
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Medication order not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        order: {
          ...order,
          individualName: buildIndividualName(order.individual),
          individualCode: order.individual?.code ?? null,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[GET /api/medication/orders/[id]] error:", error);

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