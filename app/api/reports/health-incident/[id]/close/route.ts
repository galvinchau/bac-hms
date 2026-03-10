import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getBackendBaseUrl() {
  const base =
    process.env.INTERNAL_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.API_BASE_URL ||
    "";
  return String(base).trim().replace(/\/+$/, "");
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const base = getBackendBaseUrl();

    if (!base) {
      return NextResponse.json(
        { error: "Missing API base URL" },
        { status: 500 }
      );
    }

    const json = await req.json();

    const res = await fetch(
      `${base}/reports/health-incident/${encodeURIComponent(id)}/close`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
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
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to proxy close case request" },
      { status: 500 }
    );
  }
}