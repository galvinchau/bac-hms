// app/api/schedule/master/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Helper để lấy id từ params (Next 13/14 app router)
type RouteParams = {
  params: {
    id: string;
  };
};

// GET /api/schedule/master/:id
export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = params;

  try {
    const template = await prisma.masterScheduleTemplate.findUnique({
      where: { id },
      include: {
        shifts: {
          orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error(`GET /api/schedule/master/${id} error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch master schedule template" },
      { status: 500 }
    );
  }
}

type MasterShiftInput = {
  dayOfWeek: number;
  serviceId: string;
  startMinutes: number;
  endMinutes: number;
  defaultDspId?: string | null;
  billable?: boolean;
  notes?: string | null;
};

type MasterTemplateUpdateInput = {
  name?: string | null;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  isActive?: boolean;
  notes?: string | null;
  shifts?: MasterShiftInput[]; // nếu gửi lên, sẽ replace toàn bộ shifts
};

// PUT /api/schedule/master/:id
// Body: MasterTemplateUpdateInput
export async function PUT(req: Request, { params }: RouteParams) {
  const { id } = params;

  try {
    const data = (await req.json()) as MasterTemplateUpdateInput;

    const existing = await prisma.masterScheduleTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Parse date nếu có gửi
    let effectiveFrom: Date | undefined;
    if (data.effectiveFrom) {
      effectiveFrom = new Date(data.effectiveFrom);
      if (Number.isNaN(effectiveFrom.getTime())) {
        return NextResponse.json(
          { error: "effectiveFrom must be a valid ISO date string" },
          { status: 400 }
        );
      }
    }

    let effectiveTo: Date | null | undefined;
    if (data.effectiveTo !== undefined) {
      if (data.effectiveTo === null) {
        effectiveTo = null;
      } else {
        const tmp = new Date(data.effectiveTo);
        if (Number.isNaN(tmp.getTime())) {
          return NextResponse.json(
            { error: "effectiveTo must be a valid ISO date string" },
            { status: 400 }
          );
        }
        effectiveTo = tmp;
      }
    }

    const shifts = Array.isArray(data.shifts) ? data.shifts : null;

    // Transaction: update template + replace shifts nếu có truyền lên
    const updated = await prisma.$transaction(async (tx) => {
      await tx.masterScheduleTemplate.update({
        where: { id },
        data: {
          name: data.name ?? existing.name,
          effectiveFrom: effectiveFrom ?? existing.effectiveFrom,
          effectiveTo:
            effectiveTo !== undefined ? effectiveTo : existing.effectiveTo,
          isActive:
            typeof data.isActive === "boolean"
              ? data.isActive
              : existing.isActive,
          notes: data.notes ?? existing.notes,
        },
      });

      if (shifts) {
        // Xoá toàn bộ shift cũ rồi tạo lại theo payload
        await tx.masterTemplateShift.deleteMany({
          where: { templateId: id },
        });

        if (shifts.length > 0) {
          await tx.masterTemplateShift.createMany({
            data: shifts.map((s) => ({
              templateId: id,
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
      }

      // trả về bản mới nhất kèm shifts
      const fresh = await tx.masterScheduleTemplate.findUnique({
        where: { id },
        include: {
          shifts: {
            orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
          },
        },
      });

      return fresh!;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(`PUT /api/schedule/master/${id} error:`, error);
    return NextResponse.json(
      { error: "Failed to update master schedule template" },
      { status: 500 }
    );
  }
}

// DELETE /api/schedule/master/:id
export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = params;

  try {
    // MasterTemplateShift có FK ON DELETE CASCADE nên chỉ cần delete template
    await prisma.masterScheduleTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/schedule/master/${id} error:`, error);
    return NextResponse.json(
      { error: "Failed to delete master schedule template" },
      { status: 500 }
    );
  }
}
