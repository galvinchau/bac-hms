import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request) {
  try {
    const services = await prisma.service.findMany({
      orderBy: [{ category: "asc" }, { serviceCode: "asc" }],
    });

    return NextResponse.json({ services });
  } catch (err) {
    console.error("Error loading services:", err);
    return NextResponse.json(
      { message: "Failed to load services" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
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

    const missing: string[] = [];

    if (!serviceCode) missing.push("serviceCode");
    if (!serviceName) missing.push("serviceName");
    if (!category) missing.push("category");
    if (!status) missing.push("status");

    if (missing.length > 0) {
      return NextResponse.json(
        {
          message:
            "Missing required fields: " + missing.join(", "),
        },
        { status: 400 }
      );
    }

    const created = await prisma.service.create({
      data: {
        serviceCode,
        serviceName,
        billingCode: billingCode || null,
        category,
        description: description || null,
        status,
        billable: !!billable,
        notes: notes || null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("Error creating service:", err);

    if (err?.code === "P2002") {
      // unique constraint (serviceCode)
      return NextResponse.json(
        {
          message:
            "Service code already exists. Please choose another code.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Failed to create service" },
      { status: 500 }
    );
  }
}
