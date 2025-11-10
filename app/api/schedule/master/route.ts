import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/schedule/master
 * Query:
 *  - individualId (required)
 *  - activeOnly=true|false
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const individualId = searchParams.get("individualId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    if (!individualId) {
      return NextResponse.json(
        { error: "MISSING_INDIVIDUAL_ID" },
        { status: 400 }
      );
    }

    const where: any = { individualId };
    if (activeOnly) where.isActive = true;

    const templates = await prisma.masterScheduleTemplate.findMany({
      where,
      orderBy: { effectiveFrom: "desc" },
      include: {
        shifts: {
          include: {
            service: true,
            defaultDsp: true,
          },
          orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
        },
      },
    });

    return NextResponse.json(templates);
  } catch (err) {
    console.error("Error loading master templates:", err);
    return NextResponse.json(
      { error: "FAILED_TO_LOAD_MASTER" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/schedule/master
 * Body:
 *  - individualId
 *  - name, effectiveFrom, effectiveTo, isActive, notes
 *  - shifts: [{ dayOfWeek, serviceId, startMinutes, endMinutes, defaultDspId?, billable?, notes? }]
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      individualId,
      name,
      effectiveFrom,
      effectiveTo,
      isActive,
      notes,
      shifts = [],
    } = body ?? {};

    if (!individualId || !effectiveFrom) {
      return NextResponse.json(
        { error: "MISSING_REQUIRED_FIELDS" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const tpl = await tx.masterScheduleTemplate.create({
        data: {
          individualId,
          name: name ?? "Default week",
          effectiveFrom: new Date(effectiveFrom),
          effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
          isActive: typeof isActive === "boolean" ? isActive : true,
          notes: notes ?? null,
        },
      });

      if (Array.isArray(shifts) && shifts.length > 0) {
        await tx.masterTemplateShift.createMany({
          data: shifts.map((s: any) => ({
            templateId: tpl.id,
            dayOfWeek: s.dayOfWeek,
            serviceId: s.serviceId,
            startMinutes: s.startMinutes,
            endMinutes: s.endMinutes,
            defaultDspId: s.defaultDspId ?? null,
            billable: s.billable ?? true,
            notes: s.notes ?? null,
          })),
        });
      }

      const full = await tx.masterScheduleTemplate.findUnique({
        where: { id: tpl.id },
        include: {
          shifts: {
            include: {
              service: true,
              defaultDsp: true,
            },
            orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
          },
        },
      });

      return full;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Error creating master template:", err);
    return NextResponse.json(
      { error: "FAILED_TO_CREATE_MASTER" },
      { status: 500 }
    );
  }
}
