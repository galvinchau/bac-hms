// app/api/schedule/master/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Optional: để Next.js không cache API này
export const dynamic = "force-dynamic";

// GET /api/schedule/master
// ?individualId=xxx&activeOnly=true
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const individualId = searchParams.get("individualId") || undefined;
    const activeOnly = searchParams.get("activeOnly") === "true";

    const templates = await prisma.masterScheduleTemplate.findMany({
      where: {
        ...(individualId ? { individualId } : {}),
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: {
        shifts: {
          orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
        },
      },
      orderBy: [{ effectiveFrom: "desc" }],
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("GET /api/schedule/master error:", error);
    return NextResponse.json(
      { error: "Failed to fetch master schedule templates" },
      { status: 500 }
    );
  }
}

type MasterShiftInput = {
  dayOfWeek: number; // 0 = Sun ... 6 = Sat
  serviceId: string;
  startMinutes: number; // 0-1439
  endMinutes: number;   // 0-1439 (có thể < startMinutes nếu qua ngày sau)
  defaultDspId?: string | null;
  billable?: boolean;
  notes?: string | null;
};

type MasterTemplateInput = {
  individualId: string;
  name?: string | null;
  effectiveFrom: string; // ISO date string
  effectiveTo?: string | null;
  isActive?: boolean;
  notes?: string | null;
  shifts?: MasterShiftInput[];
};

// POST /api/schedule/master
// Body: MasterTemplateInput + shifts[]
export async function POST(req: Request) {
  try {
    const data = (await req.json()) as MasterTemplateInput;

    if (!data.individualId) {
      return NextResponse.json(
        { error: "individualId is required" },
        { status: 400 }
      );
    }
    if (!data.effectiveFrom) {
      return NextResponse.json(
        { error: "effectiveFrom is required" },
        { status: 400 }
      );
    }

    const effectiveFrom = new Date(data.effectiveFrom);
    if (Number.isNaN(effectiveFrom.getTime())) {
      return NextResponse.json(
        { error: "effectiveFrom must be a valid ISO date string" },
        { status: 400 }
      );
    }

    const effectiveTo = data.effectiveTo
      ? new Date(data.effectiveTo)
      : null;
    if (effectiveTo && Number.isNaN(effectiveTo.getTime())) {
      return NextResponse.json(
        { error: "effectiveTo must be a valid ISO date string" },
        { status: 400 }
      );
    }

    const shifts = Array.isArray(data.shifts) ? data.shifts : [];

    // Validate sơ bộ shift
    for (const [index, s] of shifts.entries()) {
      if (s.dayOfWeek < 0 || s.dayOfWeek > 6) {
        return NextResponse.json(
          { error: `shifts[${index}].dayOfWeek must be between 0 and 6` },
          { status: 400 }
        );
      }
      if (!s.serviceId) {
        return NextResponse.json(
          { error: `shifts[${index}].serviceId is required` },
          { status: 400 }
        );
      }
      if (
        typeof s.startMinutes !== "number" ||
        typeof s.endMinutes !== "number"
      ) {
        return NextResponse.json(
          {
            error: `shifts[${index}].startMinutes and endMinutes must be numbers`,
          },
          { status: 400 }
        );
      }
      if (s.startMinutes < 0 || s.startMinutes > 1439) {
        return NextResponse.json(
          { error: `shifts[${index}].startMinutes must be 0–1439` },
          { status: 400 }
        );
      }
      if (s.endMinutes < 0 || s.endMinutes > 1439) {
        return NextResponse.json(
          { error: `shifts[${index}].endMinutes must be 0–1439` },
          { status: 400 }
        );
      }
    }

    const template = await prisma.masterScheduleTemplate.create({
      data: {
        individualId: data.individualId,
        name: data.name ?? null,
        effectiveFrom,
        effectiveTo,
        isActive: data.isActive ?? true,
        notes: data.notes ?? null,
        shifts: {
          create: shifts.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            serviceId: s.serviceId,
            startMinutes: s.startMinutes,
            endMinutes: s.endMinutes,
            defaultDspId: s.defaultDspId ?? null,
            billable: s.billable ?? true,
            notes: s.notes ?? null,
          })),
        },
      },
      include: {
        shifts: {
          orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("POST /api/schedule/master error:", error);
    return NextResponse.json(
      { error: "Failed to create master schedule template" },
      { status: 500 }
    );
  }
}
