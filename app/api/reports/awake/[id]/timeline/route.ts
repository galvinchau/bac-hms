// web/app/api/reports/awake/[id]/timeline/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_BAC_API_BASE_URL || "http://127.0.0.1:3333";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ message: "Missing id" }, { status: 400 });
    }

    const res = await fetch(`${API_BASE}/reports/awake/${id}/timeline`, {
      method: "GET",
      cache: "no-store",
    });

    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error?.message || "Failed to load awake timeline.",
      },
      { status: 500 }
    );
  }
}