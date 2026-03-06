// web/app/api/reports/health-incident/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function buildUrl(base: string, path: string, search: URLSearchParams) {
  const baseClean = base.replace(/\/+$/, "");
  const pathClean = path.startsWith("/") ? path : `/${path}`;
  const qs = search.toString();
  return `${baseClean}${pathClean}${qs ? `?${qs}` : ""}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    const staffId = url.searchParams.get("staffId") ?? "";
    const individualId = url.searchParams.get("individualId") ?? "";
    const status = url.searchParams.get("status") ?? ""; // DRAFT|SUBMITTED|IN_REVIEW|CLOSED

    const API_BASE =
      process.env.BAC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_BAC_API_BASE_URL ||
      "http://127.0.0.1:3333";

    const search = new URLSearchParams();
    if (from) search.set("from", from);
    if (to) search.set("to", to);
    if (staffId) search.set("staffId", staffId);
    if (individualId) search.set("individualId", individualId);
    if (status) search.set("status", status);

    // Upstream endpoint (bac-api)
    const target = buildUrl(API_BASE, "/reports/health-incident", search);

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(target, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
    } catch (err: any) {
      return NextResponse.json(
        {
          message: "Failed to reach upstream (fetch failed)",
          upstream: target,
          hint: "Check bac-api is running and listening on the expected port (usually 3333).",
          error: err?.message ?? String(err),
        },
        { status: 502 }
      );
    }

    const text = await upstreamRes.text();

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          message: "Upstream returned non-OK response",
          upstream: target,
          status: upstreamRes.status,
          statusText: upstreamRes.statusText,
          upstreamBodyPreview: text.slice(0, 400),
        },
        { status: 502 }
      );
    }

    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: 200 });
    } catch {
      return NextResponse.json(
        {
          message: "Upstream did not return valid JSON",
          upstream: target,
          upstreamBodyPreview: text.slice(0, 400),
        },
        { status: 502 }
      );
    }
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}