// C:\bac-hms\web\app\api\authorizations\[id]\route.ts

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

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function computeAuthorizationUsage(input: {
  maximum?: unknown;
  manualUsed?: unknown;
  manualMissed?: unknown;
  autoUsed?: unknown;
  autoMissed?: unknown;
}) {
  const maximum = toNumber(input.maximum, 0);
  const manualUsed = toNumber(input.manualUsed, 0);
  const manualMissed = toNumber(input.manualMissed, 0);
  const autoUsed = toNumber(input.autoUsed, 0);
  const autoMissed = toNumber(input.autoMissed, 0);

  const totalUsed = manualUsed + autoUsed;
  const totalMissed = manualMissed + autoMissed;
  const remaining = maximum - totalUsed - totalMissed;

  return {
    maximum,
    manualUsed,
    manualMissed,
    autoUsed,
    autoMissed,
    totalUsed,
    totalMissed,
    remaining,
  };
}

function enrichAuthorization<
  T extends {
    maximum: number;
    manualUsed?: number | null;
    manualMissed?: number | null;
  },
>(item: T) {
  const autoUsed = 0;
  const autoMissed = 0;

  const calc = computeAuthorizationUsage({
    maximum: item.maximum,
    manualUsed: item.manualUsed ?? 0,
    manualMissed: item.manualMissed ?? 0,
    autoUsed,
    autoMissed,
  });

  return {
    ...item,
    manualUsed: item.manualUsed ?? 0,
    manualMissed: item.manualMissed ?? 0,
    autoUsed,
    autoMissed,
    totalUsed: calc.totalUsed,
    totalMissed: calc.totalMissed,
    remaining: calc.remaining,
  };
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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const authorizationId = String(id || "").trim();

    if (!authorizationId) {
      return NextResponse.json(
        { message: "Authorization id is required." },
        { status: 400 },
      );
    }

    const item = await prisma.authorization.findUnique({
      where: { id: authorizationId },
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

    if (!item) {
      return NextResponse.json(
        { message: "Authorization not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(enrichAuthorization(item), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    console.error("GET /api/authorizations/[id] error:", err);
    return NextResponse.json(
      {
        message: "Failed to load authorization",
        detail: String(err?.message || err),
      },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const authorizationId = String(id || "").trim();

    if (!authorizationId) {
      return NextResponse.json(
        { message: "Authorization id is required." },
        { status: 400 },
      );
    }

    const existing = await prisma.authorization.findUnique({
      where: { id: authorizationId },
      select: {
        id: true,
        individualId: true,
        authorizationNumber: true,
        serviceId: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Authorization not found." },
        { status: 404 },
      );
    }

    const body = await req.json();

    const authorizationNumber = String(
      body?.authorizationNumber ?? existing.authorizationNumber ?? "",
    ).trim();

    const individualId = String(
      body?.individualId ?? existing.individualId ?? "",
    ).trim();

    const payer = String(body?.payer ?? "").trim();
    const startDate = toDate(body?.startDate);
    const endDate = toDate(body?.endDate);
    const maximum = Number(body?.maximum ?? 0);

    const snapshotThroughDate = toDate(body?.snapshotThroughDate);
    const manualUsed = toNumber(body?.manualUsed, 0);
    const manualMissed = toNumber(body?.manualMissed, 0);

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
        : [
            {
              serviceId: existing.serviceId,
              eventCode: body?.eventCode ?? null,
              format: body?.format ?? null,
              program: body?.program ?? null,
              modifier1: body?.modifier1 ?? null,
              modifier2: body?.modifier2 ?? null,
              modifier3: body?.modifier3 ?? null,
              modifier4: body?.modifier4 ?? null,
            },
          ];

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

    if (services.length > 1) {
      return NextResponse.json(
        {
          message:
            "Update endpoint supports one authorization record at a time. Please submit only one service line.",
        },
        { status: 400 },
      );
    }

    const serviceLine = services[0];

    const missing: string[] = [];
    if (!authorizationNumber) missing.push("authorizationNumber");
    if (!individualId) missing.push("individualId");
    if (!payer) missing.push("payer");
    if (!startDate) missing.push("startDate");
    if (!endDate) missing.push("endDate");
    if (!Number.isFinite(maximum)) missing.push("maximum");
    if (!serviceLine?.serviceId) missing.push("serviceId");
    if (!serviceLine?.format) missing.push("format");

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
        where: { id: serviceLine.serviceId },
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
        { message: "Selected service was not found." },
        { status: 404 },
      );
    }

    const duplicate = await prisma.authorization.findFirst({
      where: {
        id: { not: authorizationId },
        individualId,
        authorizationNumber,
        serviceId: service.id,
      },
      select: { id: true },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          message:
            "This authorization already contains this service for this individual.",
          field: "authorizationServiceComposite",
        },
        { status: 409 },
      );
    }

    const calc = computeAuthorizationUsage({
      maximum,
      manualUsed,
      manualMissed,
      autoUsed: 0,
      autoMissed: 0,
    });

    const updated = await prisma.authorization.update({
      where: { id: authorizationId },
      data: {
        authorizationNumber,
        individualId,
        serviceId: service.id,
        payer,
        eventCode: serviceLine.eventCode,
        format: serviceLine.format,
        program: serviceLine.program,
        modifier1: serviceLine.modifier1,
        modifier2: serviceLine.modifier2,
        modifier3: serviceLine.modifier3,
        modifier4: serviceLine.modifier4,
        startDate,
        endDate,
        maximum,
        used: 0,
        remaining: calc.remaining, // keep DB field in sync, API response uses computed value
        snapshotThroughDate,
        manualUsed,
        manualMissed,
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

    return NextResponse.json({
      message: "Authorization updated successfully.",
      item: enrichAuthorization(updated),
    });
  } catch (err: any) {
    console.error("PUT /api/authorizations/[id] error:", err);

    if (err?.code === "P2002") {
      return NextResponse.json(
        {
          message:
            "This authorization already contains this service for this individual.",
          field: "authorizationServiceComposite",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        message: "Failed to update authorization",
        detail: String(err?.message || err),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const authorizationId = String(id || "").trim();

    if (!authorizationId) {
      return NextResponse.json(
        { message: "Authorization id is required." },
        { status: 400 },
      );
    }

    const existing = await prisma.authorization.findUnique({
      where: { id: authorizationId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Authorization not found." },
        { status: 404 },
      );
    }

    await prisma.authorization.delete({
      where: { id: authorizationId },
    });

    return NextResponse.json({
      message: "Authorization deleted successfully.",
      id: authorizationId,
    });
  } catch (err: any) {
    console.error("DELETE /api/authorizations/[id] error:", err);
    return NextResponse.json(
      {
        message: "Failed to delete authorization",
        detail: String(err?.message || err),
      },
      { status: 500 },
    );
  }
}