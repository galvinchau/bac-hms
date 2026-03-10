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

    const res = await fetch(
      `${base}/reports/health-incident/${encodeURIComponent(id)}/attachments`,
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
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to proxy attachments GET" },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const mode = req.nextUrl.searchParams.get("mode");

    if (mode === "upload") {
      const incoming = await req.formData();

      const form = new FormData();

      const category = String(incoming.get("category") || "");
      const description = String(incoming.get("description") || "");
      const uploadedByUserId = String(incoming.get("uploadedByUserId") || "");
      const uploadedByEmployeeId = String(
        incoming.get("uploadedByEmployeeId") || ""
      );
      const uploadedByName = String(incoming.get("uploadedByName") || "");
      const uploadedByRole = String(incoming.get("uploadedByRole") || "");
      const file = incoming.get("file");

      if (category) form.append("category", category);
      if (description) form.append("description", description);
      if (uploadedByUserId) form.append("uploadedByUserId", uploadedByUserId);
      if (uploadedByEmployeeId) {
        form.append("uploadedByEmployeeId", uploadedByEmployeeId);
      }
      if (uploadedByName) form.append("uploadedByName", uploadedByName);
      if (uploadedByRole) form.append("uploadedByRole", uploadedByRole);

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Missing file in form data" },
          { status: 400 }
        );
      }

      form.append("file", file, file.name);

      const res = await fetch(
        `${base}/reports/health-incident/${encodeURIComponent(
          id
        )}/attachments/upload`,
        {
          method: "POST",
          body: form,
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
    }

    const json = await req.json();

    const res = await fetch(
      `${base}/reports/health-incident/${encodeURIComponent(id)}/attachments`,
      {
        method: "POST",
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
      { error: e?.message || "Failed to proxy attachments POST" },
      { status: 500 }
    );
  }
}