// Web/app/api/individuals/[id]/isp-bsp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: {
    id: string;
  };
};

// helper: luôn cố gắng lấy individualId từ nhiều nguồn
function getIndividualId(req: NextRequest, params?: { id?: string }) {
  const search = req.nextUrl.searchParams;

  // ưu tiên params.id (đúng chuẩn Next)
  const fromParams = params?.id;

  // fallback: query ?individualId=... hoặc ?id=...
  const fromQuery = search.get("individualId") || search.get("id") || undefined;

  return fromParams || fromQuery || "";
}

// GET: lấy dữ liệu ISP & BSP cho 1 Individual
export async function GET(req: NextRequest, { params }: RouteParams) {
  const individualId = getIndividualId(req, params);

  if (!individualId) {
    return NextResponse.json(
      { error: "Missing individual id" },
      { status: 400 }
    );
  }

  try {
    const record = await prisma.ispBspForm.findUnique({
      where: { individualId },
    });

    return NextResponse.json(
      {
        data: record ? record.formData : null,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GET /api/individuals/[id]/isp-bsp error", error);
    return NextResponse.json(
      {
        error: "Failed to load ISP/BSP form",
        message: String(error?.message ?? error),
      },
      { status: 500 }
    );
  }
}

// PUT: lưu / cập nhật dữ liệu ISP & BSP cho 1 Individual
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const individualId = getIndividualId(req, params);

  if (!individualId) {
    return NextResponse.json(
      { error: "Missing individual id" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();

    // formData: là toàn bộ object dữ liệu form
    const formData = body?.formData ?? body;

    if (!formData || typeof formData !== "object") {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const saved = await prisma.ispBspForm.upsert({
      where: { individualId },
      update: { formData },
      create: {
        individualId,
        formData,
      },
    });

    return NextResponse.json(
      {
        data: saved.formData,
        message: "ISP/BSP form saved successfully",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("PUT /api/individuals/[id]/isp-bsp error", error);
    return NextResponse.json(
      {
        error: "Failed to save ISP/BSP form",
        message: String(error?.message ?? error),
      },
      { status: 500 }
    );
  }
}
