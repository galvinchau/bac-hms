import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  "http://localhost:4000";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id || String(id).trim() === "") {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const res = await fetch(
      `${API_BASE}/reports/health-incident/${encodeURIComponent(id)}/timeline`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (error: any) {
    console.error("[api/reports/health-incident/[id]/timeline] GET error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}