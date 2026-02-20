// web/app/api/poc/duties/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type DutyItem = {
  id: string;
  pocId: string;
  category?: string | null;
  taskNo?: number | null;
  duty: string;
  instruction?: string | null;
  daysOfWeek?: any; // jsonb (array/object/string)
  sortOrder?: number | null;
};

function jsonOk(items: any) {
  return NextResponse.json({ ok: true, items });
}
function jsonErr(status: number, error: string, detail?: string) {
  return NextResponse.json({ ok: false, error, detail }, { status });
}

function getDowKeyFromYmd(ymd: string): {
  idx: number; // 0..6 (Sun..Sat)
  short: "S" | "M" | "T" | "W" | "F";
  long: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
} | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;

  // mid-day UTC avoids DST edge
  const dt = new Date(`${ymd}T12:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  }).format(dt);

  const map: Record<string, { idx: number; long: any; short: any }> = {
    Sun: { idx: 0, long: "sun", short: "S" },
    Mon: { idx: 1, long: "mon", short: "M" },
    Tue: { idx: 2, long: "tue", short: "T" },
    Wed: { idx: 3, long: "wed", short: "W" },
    Thu: { idx: 4, long: "thu", short: "T" },
    Fri: { idx: 5, long: "fri", short: "F" },
    Sat: { idx: 6, long: "sat", short: "S" },
  };

  const hit = map[weekday];
  return hit || null;
}

function weekdayToUpperShort(idx: number) {
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][idx] || "";
}

function capitalize(s: string) {
  if (!s) return s;
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

function dutyAppliesToDay(daysOfWeek: any, ymd: string): boolean {
  if (!daysOfWeek) return true;

  const dow = getDowKeyFromYmd(ymd);
  if (!dow) return true;

  let v: any = daysOfWeek;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      // ignore
    }
  }

  if (Array.isArray(v)) {
    const set = new Set(v.map((x) => String(x).trim().toLowerCase()));
    if (set.has(dow.long)) return true; // "mon"
    if (set.has(dow.long.slice(0, 1))) return true; // "m"
    if (set.has(dow.short.toLowerCase())) return true; // "m","t"
    const upper = new Set(v.map((x) => String(x).trim().toUpperCase()));
    if (upper.has(dow.long.toUpperCase())) return true; // "MON"
    if (upper.has(weekdayToUpperShort(dow.idx))) return true; // "MON"
    return false;
  }

  if (v && typeof v === "object") {
    if (v[String(dow.idx)] === true) return true;

    if (v[dow.long] === true) return true;
    if (v[dow.long.toUpperCase()] === true) return true;

    if (v[dow.short] === true) return true;
    if (v[dow.short.toLowerCase()] === true) return true;

    const k1 = capitalize(dow.long);
    if (v[k1] === true) return true;

    return false;
  }

  return true;
}

async function readAllDuties(pocId: string): Promise<DutyItem[]> {
  if (!pocId) return [];
  const out: any[] = [];

  // snake
  try {
    const a = (await prisma.$queryRawUnsafe(
      `
      SELECT
        d.id,
        d.pocid AS "pocId",
        d.category,
        d.taskno AS "taskNo",
        d.duty,
        d.instruction,
        d.daysofweek AS "daysOfWeek",
        d.sortorder AS "sortOrder"
      FROM public.poc_duty d
      WHERE d.pocid = $1
      ORDER BY d.sortorder NULLS LAST, d.taskno NULLS LAST, d.duty
    `,
      pocId
    )) as any[];
    if (Array.isArray(a)) out.push(...a);
  } catch {
    // ignore
  }

  // camel (quoted)
  try {
    const b = (await prisma.$queryRawUnsafe(
      `
      SELECT
        d.id,
        d."pocId" AS "pocId",
        d.category,
        d."taskNo" AS "taskNo",
        d.duty,
        d.instruction,
        d."daysOfWeek" AS "daysOfWeek",
        d."sortOrder" AS "sortOrder"
      FROM public."POC_Duty" d
      WHERE d."pocId" = $1
      ORDER BY d."sortOrder" NULLS LAST, d."taskNo" NULLS LAST, d.duty
    `,
      pocId
    )) as any[];
    if (Array.isArray(b)) out.push(...b);
  } catch {
    // ignore
  }

  // dedup by id
  const seen = new Set<string>();
  const dedup: DutyItem[] = [];
  for (const x of out) {
    const id = String(x?.id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    dedup.push({
      id,
      pocId: String(x?.pocId || pocId),
      category: x?.category ?? null,
      taskNo: x?.taskNo === null || x?.taskNo === undefined ? null : Number(x.taskNo),
      duty: String(x?.duty || ""),
      instruction: x?.instruction ?? null,
      daysOfWeek: x?.daysOfWeek ?? null,
      sortOrder: x?.sortOrder === null || x?.sortOrder === undefined ? null : Number(x.sortOrder),
    });
  }

  return dedup;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pocId = (searchParams.get("pocId") || "").trim();
    const date = (searchParams.get("date") || "").trim(); // optional YYYY-MM-DD

    if (!pocId) return jsonErr(400, "Missing pocId");

    const duties = await readAllDuties(pocId);

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const filtered = duties.filter((d) => dutyAppliesToDay(d.daysOfWeek, date));
      return jsonOk(filtered);
    }

    return jsonOk(duties);
  } catch (e: any) {
    return jsonErr(500, "Server error", String(e?.message || e));
  }
}
