// C:\bac-hms\web\app\api\reports\daily-notes\[id]\route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function buildUrl(base: string, path: string) {
  const baseClean = base.replace(/\/+$/, "");
  const pathClean = path.startsWith("/") ? path : `/${path}`;
  return `${baseClean}${pathClean}`;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // ✅ Next.js (newer) may provide params as a Promise
    const rawParams: any = (ctx as any)?.params;
    const params =
      typeof rawParams?.then === "function" ? await rawParams : rawParams;

    const id = params?.id;
    if (!id) {
      return NextResponse.json({ message: "Missing id" }, { status: 400 });
    }

    const API_BASE =
      process.env.BAC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_BAC_API_BASE_URL ||
      "http://127.0.0.1:3333";

    // GET /reports/daily-notes/:id
    const target = buildUrl(
      API_BASE,
      `/reports/daily-notes/${encodeURIComponent(id)}`
    );

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
