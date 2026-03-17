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

function toStringOrNull(value: unknown) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s : null;
}

type IncomingServiceLine = {
  serviceId?: string;
  eventCode?: string | null;
  format?: string | null;
  program?: string | null;
  modifier1?: string | null;
  modifier2?: string | null;
  modifier3?: string | null;
  modifier4?: string | null;
};

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
    const payer = String(body?.payer ?? "").trim();
    const startDate = toDate(body?.startDate);
    const endDate = toDate(body?.endDate);
    const maximum = Number(body?.maximum ?? 0);

    const rawServices: IncomingServiceLine[] = Array.isArray(body?.services)
      ? body.services
      : body?.serviceId
        ? [
            {
              serviceId: body.serviceId,
              eventCode: body?.eventCode ?? null,
              format: body?.format ?? null,
              program: body?.program ?? null,
              modifier1: body?.modifier1 ?? null,
              modifier2: body?.modifier2 ?? null,
              modifier3: body?.modifier3 ?? null,
              modifier4: body?.modifier4 ?? null,
            },
          ]
        : [];

    const services = rawServices
      .map((line) => ({
        serviceId: String(line?.serviceId ?? "").trim(),
        eventCode: toStringOrNull(line?.eventCode),
        format: toStringOrNull(line?.format),
        program: toStringOrNull(line?.program),
        modifier1: toStringOrNull(line?.modifier1),
        modifier2: toStringOrNull(line?.modifier2),
        modifier3: toStringOrNull(line?.modifier3),
        modifier4: toStringOrNull(line?.modifier4),
      }))
      .filter((line) => line.serviceId);

    const missing: string[] = [];
    if (!authorizationNumber) missing.push("authorizationNumber");
    if (!individualId) missing.push("individualId");
    if (!payer) missing.push("payer");
    if (!startDate) missing.push("startDate");
    if (!endDate) missing.push("endDate");
    if (!Number.isFinite(maximum)) missing.push("maximum");
    if (services.length === 0) missing.push("services");

    if (services.length > 5) {
      return NextResponse.json(
        { message: "A maximum of 5 service lines is allowed." },
        { status: 400 },
      );
    }

    const duplicateServiceIds = services
      .map((s) => s.serviceId)
      .filter((id, idx, arr) => arr.indexOf(id) !== idx);

    if (duplicateServiceIds.length > 0) {
      return NextResponse.json(
        { message: "Duplicate service lines are not allowed in one authorization." },
        { status: 400 },
      );
    }

    const missingFormatIndex = services.findIndex((s) => !s.format);
    if (missingFormatIndex >= 0) {
      return NextResponse.json(
        {
          message: `Service line ${missingFormatIndex + 1} is missing format.`,
        },
        { status: 400 },
      );
    }

    if (missing.length > 0) {
      return NextResponse.json(
        { message: "Missing or invalid fields: " + missing.join(", ") },
        { status: 400 },
      );
    }

    const [individual, serviceList] = await Promise.all([
      prisma.individual.findUnique({
        where: { id: individualId },
        select: { id: true },
      }),
      prisma.service.findMany({
        where: {
          id: { in: services.map((s) => s.serviceId) },
        },
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

    if (serviceList.length !== services.length) {
      return NextResponse.json(
        { message: "One or more selected services were not found." },
        { status: 404 },
      );
    }

    const serviceMap = new Map(serviceList.map((s) => [s.id, s]));
    const used = 0;
    const remaining = Math.max(maximum - used, 0);

    const created = await prisma.$transaction(
      services.map((line) => {
        const service = serviceMap.get(line.serviceId)!;

        return prisma.authorization.create({
          data: {
            authorizationNumber,
            individualId,
            serviceId: line.serviceId,
            payer,
            eventCode: line.eventCode,
            format: line.format!,
            program: line.program,
            modifier1: line.modifier1,
            modifier2: line.modifier2,
            modifier3: line.modifier3,
            modifier4: line.modifier4,
            startDate,
            endDate,
            maximum,
            used,
            remaining,
            status: body?.status ? String(body.status) : "PENDING",
            source: body?.source ? String(body.source) : "MANUAL",
            voided: !!body?.voided,
            comments: toStringOrNull(body?.comments),
            intervalType: toStringOrNull(body?.intervalType),
            intervalLimit: toNumberOrNull(body?.intervalLimit),
            intervalStart: toDate(body?.intervalStart),
            intervalEnd: toDate(body?.intervalEnd),
            serviceCode: service.serviceCode,
            serviceName: service.serviceName,
          },
        });
      }),
    );

    return NextResponse.json(
      {
        message: "Authorization saved successfully.",
        count: created.length,
        items: created,
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("POST /api/authorizations error:", err);

    if (err?.code === "P2002") {
      return NextResponse.json(
        {
          message:
            "This authorization already contains one of the selected services for this individual.",
          field: "authorizationServiceComposite",
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