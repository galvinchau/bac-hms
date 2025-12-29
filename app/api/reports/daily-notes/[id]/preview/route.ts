// Web\app\api\reports\daily-notes\[id]\preview\route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function buildUrl(base: string, p: string) {
  const baseClean = base.replace(/\/+$/, "");
  const pathClean = p.startsWith("/") ? p : `/${p}`;
  return `${baseClean}${pathClean}`;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // ✅ Next.js may provide params as a Promise
    const rawParams: any = (ctx as any)?.params;
    const params =
      typeof rawParams?.then === "function" ? await rawParams : rawParams;

    const id = params?.id;
    if (!id || String(id).trim() === "") {
      return NextResponse.json({ message: "Missing id" }, { status: 400 });
    }

    const type = req.nextUrl.searchParams.get("type") || "staff";

    const BAC_API =
      process.env.BAC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_BAC_API_BASE_URL ||
      "http://127.0.0.1:3333";

    // Forward cookies so backend auth (if any) works
    const cookie = req.headers.get("cookie") || "";

    // ✅ Backend preview endpoint doesn't require `type`, but harmless if present
    const target = buildUrl(
      BAC_API,
      `/reports/daily-notes/${encodeURIComponent(
        id
      )}/preview?type=${encodeURIComponent(type)}`
    );

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(target, {
        method: "GET",
        headers: {
          cookie,
          accept: "application/json",
        },
        cache: "no-store",
      });
    } catch (err: any) {
      return NextResponse.json(
        {
          message: "Failed to reach upstream (fetch failed)",
          upstream: target,
          error: err?.message ?? String(err),
        },
        { status: 502 }
      );
    }

    const text = await upstreamRes.text();

    // Pass through status codes (400/404/etc.)
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: upstreamRes.status });
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
