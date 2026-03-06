import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getApiBaseUrl() {
  // ✅ Adjust to your project env (keep multiple fallbacks)
  return (
    process.env.BAC_API_URL ||
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:4000"
  );
}

async function getIdFromCtx(ctx: any): Promise<string> {
  // Next.js versions can pass params as an object OR a Promise.
  const rawParams = ctx?.params;

  const params =
    rawParams && typeof rawParams.then === "function" ? await rawParams : rawParams;

  const id = params?.id ? String(params.id).trim() : "";
  return id;
}

export async function PATCH(req: Request, ctx: any) {
  try {
    const id = await getIdFromCtx(ctx);

    if (!id) {
      return NextResponse.json({ message: "Missing id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    // Forward auth/cookies to backend if needed
    const headers = new Headers();
    headers.set("Content-Type", "application/json");

    const cookie = req.headers.get("cookie");
    if (cookie) headers.set("cookie", cookie);

    const authorization = req.headers.get("authorization");
    if (authorization) headers.set("authorization", authorization);

    const apiBase = getApiBaseUrl();

    const upstream = await fetch(
      `${apiBase}/reports/health-incident/${encodeURIComponent(id)}/assign`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

    const text = await upstream.text();

    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") || "application/json",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}