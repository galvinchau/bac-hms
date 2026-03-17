import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toDate(value: unknown) {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET() {
  try {
    const items = await prisma.authorization.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        individual: {
          select: {
            id: true,
            code: true,
            firstName: true,
            middleName: true,
            lastName: true,
            medicaidId: true,
            status: true,
          },
        },
        service: {
          select: {
            id: true,
            serviceCode: true,
            serviceName: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err: any) {
    console.error("GET /api/authorizations error:", err);
    return NextResponse.json(
      {
        message: "Failed to load authorizations",
        detail: String(err?.message || err),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const authorizationNumber = String(
      body?.authorizationNumber ?? "",
    ).trim();
    const individualId = String(body?.individualId ?? "").trim();
    const serviceId = String(body?.serviceId ?? "").trim();
    const payer = String(body?.payer ?? "").trim();
    const format = String(body?.format ?? "").trim();
    const startDate = toDate(body?.startDate);
    const endDate = toDate(body?.endDate);
    const maximum = Number(body?.maximum ?? 0);

    const missing: string[] = [];
    if (!authorizationNumber) missing.push("authorizationNumber");
    if (!individualId) missing.push("individualId");
    if (!serviceId) missing.push("serviceId");
    if (!payer) missing.push("payer");
    if (!format) missing.push("format");
    if (!startDate) missing.push("startDate");
    if (!endDate) missing.push("endDate");
    if (!Number.isFinite(maximum)) missing.push("maximum");

    if (missing.length > 0) {
      return NextResponse.json(
        { message: "Missing or invalid fields: " + missing.join(", ") },
        { status: 400 },
      );
    }

    const [individual, service] = await Promise.all([
      prisma.individual.findUnique({
        where: { id: individualId },
        select: { id: true },
      }),
      prisma.service.findUnique({
        where: { id: serviceId },
        select: {
          id: true,
          serviceCode: true,
          serviceName: true,
          status: true,
        },
      }),
    ]);

    if (!individual) {
      return NextResponse.json(
        { message: "Individual not found" },
        { status: 404 },
      );
    }

    if (!service) {
      return NextResponse.json(
        { message: "Service not found" },
        { status: 404 },
      );
    }

    const used = 0;
    const remaining = Math.max(maximum - used, 0);

    const created = await prisma.authorization.create({
      data: {
        authorizationNumber,
        individualId,
        serviceId,
        payer,
        eventCode: body?.eventCode ? String(body.eventCode) : null,
        format,
        program: body?.program ? String(body.program) : null,
        modifier1: body?.modifier1 ? String(body.modifier1) : null,
        modifier2: body?.modifier2 ? String(body.modifier2) : null,
        modifier3: body?.modifier3 ? String(body.modifier3) : null,
        modifier4: body?.modifier4 ? String(body.modifier4) : null,
        startDate,
        endDate,
        maximum,
        used,
        remaining,
        status: body?.status ? String(body.status) : "PENDING",
        source: body?.source ? String(body.source) : "MANUAL",
        voided: !!body?.voided,
        comments: body?.comments ? String(body.comments) : null,
        intervalType: body?.intervalType ? String(body.intervalType) : null,
        intervalLimit: toNumberOrNull(body?.intervalLimit),
        intervalStart: toDate(body?.intervalStart),
        intervalEnd: toDate(body?.intervalEnd),
        serviceCode: service.serviceCode,
        serviceName: service.serviceName,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/authorizations error:", err);

    if (err?.code === "P2002") {
      return NextResponse.json(
        {
          message:
            "Authorization Number already exists. Please enter a different number.",
          field: "authorizationNumber",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        message: "Failed to create authorization",
        detail: String(err?.message || err),
      },
      { status: 500 },
    );
  }
}