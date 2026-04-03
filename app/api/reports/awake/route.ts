// web/app/api/reports/awake/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_BAC_API_BASE_URL || "http://127.0.0.1:3333";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const qs = new URLSearchParams();
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const staffId = searchParams.get("staffId");
    const individualId = searchParams.get("individualId");
    const status = searchParams.get("status");

    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (staffId) qs.set("staffId", staffId);
    if (individualId) qs.set("individualId", individualId);
    if (status) qs.set("status", status);

    const url = `${API_BASE}/reports/awake${
      qs.toString() ? `?${qs.toString()}` : ""
    }`;

    const res = await fetch(url, {
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
        message: error?.message || "Failed to load awake reports.",
      },
      { status: 500 }
    );
  }
}