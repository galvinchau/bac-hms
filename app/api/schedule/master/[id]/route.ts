import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { id?: string } };

/**
 * PUT /api/schedule/master/[id]
 *
 * Body:
 *  - name, effectiveFrom, effectiveTo, isActive, notes
 *  - shifts: [{ dayOfWeek, serviceId, startMinutes, endMinutes, defaultDspId?, billable?, notes? }]
 *
 * Chiến lược: update template + xoá toàn bộ shifts cũ + tạo lại shifts mới.
 */
export async function PUT(req: Request, { params }: Params) {
  try {
    const url = new URL(req.url);
    const { searchParams } = url;

    // đọc body trước để có thể lấy id trong body nếu cần
    const body = await req.json().catch(() => ({} as any));

    const pathId = params?.id;
    const queryId = searchParams.get("id") || undefined;
    const bodyId = (body as any)?.id as string | undefined;

    const id = pathId || queryId || bodyId;

    if (!id) {
      console.error("PUT /api/schedule/master/[id] missing id", {
        pathId,
        queryId,
        bodyId,
      });
      return NextResponse.json(
        { error: "MISSING_TEMPLATE_ID" },
        { status: 400 }
      );
    }

    const {
      name,
      effectiveFrom,
      effectiveTo,
      isActive,
      notes,
      shifts = [],
    } = body ?? {};

    const result = await prisma.$transaction(async (tx) => {
      // cập nhật header template
      await tx.masterScheduleTemplate.update({
        where: { id },
        data: {
          name: name ?? "Default week",
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
          effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
          isActive: typeof isActive === "boolean" ? isActive : undefined,
          notes: notes ?? null,
        },
      });

      // xoá toàn bộ shifts cũ
      await tx.masterTemplateShift.deleteMany({
        where: { templateId: id },
      });

      // tạo lại shifts mới
      if (Array.isArray(shifts) && shifts.length > 0) {
        await tx.masterTemplateShift.createMany({
          data: shifts.map((s: any) => ({
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

      // trả về template đầy đủ
      const full = await tx.masterScheduleTemplate.findUnique({
        where: { id },
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

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error updating master template:", err);
    return NextResponse.json(
      {
        error: "FAILED_TO_UPDATE_MASTER",
        detail: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}
