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

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await context.params;
    const base = getBackendBaseUrl();

    if (!base) {
      return NextResponse.json(
        { error: "Missing API base URL" },
        { status: 500 }
      );
    }

    const res = await fetch(
      `${base}/reports/health-incident/${encodeURIComponent(
        id
      )}/attachments/${encodeURIComponent(attachmentId)}/download`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const buf = await res.arrayBuffer();

    return new NextResponse(buf, {
      status: res.status,
      headers: {
        "Content-Type":
          res.headers.get("content-type") || "application/octet-stream",
        "Content-Disposition":
          res.headers.get("content-disposition") || "inline",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to proxy attachment download" },
      { status: 500 }
    );
  }
}