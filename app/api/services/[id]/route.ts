// app/api/services/[id]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: lấy thông tin 1 service theo ID
export async function GET(_req: Request, context: any) {
  try {
    // context.params có thể là object hoặc Promise<object> nên dùng await cho chắc
    const { id } = await context.params;

    const service = await prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      return NextResponse.json(
        { message: "Service not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error("Error fetching service:", error);
    return NextResponse.json(
      { message: "Failed to fetch service" },
      { status: 500 }
    );
  }
}

// PUT: cập nhật service
export async function PUT(req: Request, context: any) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const updated = await prisma.service.update({
      where: { id },
      data: {
        serviceCode: body.serviceCode,
        serviceName: body.serviceName,
        billingCode: body.billingCode,
        category: body.category,
        description: body.description,
        status: body.status,
        billable: body.billable,
        notes: body.notes,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json(
      { message: "Failed to update service" },
      { status: 500 }
    );
  }
}

// DELETE: xoá service
export async function DELETE(_req: Request, context: any) {
  try {
    const { id } = await context.params;

    await prisma.service.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { message: "Failed to delete service" },
      { status: 500 }
    );
  }
}
