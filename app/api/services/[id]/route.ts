import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: { id: string };
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const id = context.params.id;
    if (!id) {
      return NextResponse.json(
        { message: "Missing service id" },
        { status: 400 }
      );
    }

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
  } catch (err) {
    console.error("Error loading service:", err);
    return NextResponse.json(
      { message: "Failed to load service" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const id = context.params.id;
    if (!id) {
      return NextResponse.json(
        { message: "Missing service id" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const {
      serviceCode,
      serviceName,
      billingCode,
      category,
      description,
      status,
      billable,
      notes,
    } = body ?? {};

    const updated = await prisma.service.update({
      where: { id },
      data: {
        serviceCode,
        serviceName,
        billingCode,
        category,
        description,
        status,
        billable,
        notes,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("Error updating service:", err);

    if (err?.code === "P2002") {
      return NextResponse.json(
        {
          message:
            "Service code already exists. Please choose another code.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Failed to update service" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const id = context.params.id;
    if (!id) {
      return NextResponse.json(
        { message: "Missing service id" },
        { status: 400 }
      );
    }

    await prisma.service.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error deleting service:", err);
    return NextResponse.json(
      { message: "Failed to delete service" },
      { status: 500 }
    );
  }
}
