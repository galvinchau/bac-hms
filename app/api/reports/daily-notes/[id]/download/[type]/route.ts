// web/app/api/reports/daily-notes/[id]/download/[type]/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function buildUrl(base: string, path: string) {
  const baseClean = base.replace(/\/+$/, "");
  const pathClean = path.startsWith("/") ? path : `/${path}`;
  return `${baseClean}${pathClean}`;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string; type: string }> }
) {
  const { id, type } = await ctx.params;

  const API_BASE =
    process.env.BAC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BAC_API_BASE_URL ||
    "http://127.0.0.1:3333";

  const target = buildUrl(
    API_BASE,
    `/reports/daily-notes/${id}/download/${type}`
  );

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(target, { method: "GET", cache: "no-store" });
  } catch (err: any) {
    return NextResponse.json(
      {
        message: "Fetch failed",
        upstream: target,
        error: err?.message ?? String(err),
      },
      { status: 502 }
    );
  }

  if (!upstreamRes.ok) {
    const txt = await upstreamRes.text();
    return NextResponse.json(
      {
        message: "Upstream download failed",
        upstream: target,
        status: upstreamRes.status,
        upstreamBodyPreview: txt.slice(0, 400),
      },
      { status: 502 }
    );
  }

  const headers = new Headers(upstreamRes.headers);
  const buf = await upstreamRes.arrayBuffer();

  return new NextResponse(buf, {
    status: 200,
    headers,
  });
}
