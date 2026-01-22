// web/app/api/medication/mar/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TZ = "America/New_York";

// ✅ Auto-generated rows: status MUST be null because enum has only GIVEN/REFUSED/MISSED/...
const GENERATED_STATUS = null as any;

/**
 * Parse YYYY-MM to { year, monthIndex0 }
 */
function parseMonth(month: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const year = Number(m[1]);
  const mon = Number(m[2]);
  if (!year || mon < 1 || mon > 12) return null;
  return { year, monthIndex0: mon - 1 };
}

/**
 * Convert a "local wall clock" datetime in a specific IANA time zone
 * to a real JS Date (UTC instant).
 *
 * We avoid extra deps by using Intl.DateTimeFormat parts trick.
 */
function zonedWallClockToUtcDate(
  year: number,
  monthIndex0: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const utcGuess = new Date(Date.UTC(year, monthIndex0, day, hour, minute, 0));

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = dtf.formatToParts(utcGuess);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;

  const y = Number(get("year"));
  const mo = Number(get("month")) - 1;
  const d = Number(get("day"));
  const h = Number(get("hour"));
  const mi = Number(get("minute"));
  const s = Number(get("second"));

  const tzWallClockAsUTC = Date.UTC(y, mo, d, h, mi, s);
  const guessUTC = Date.UTC(year, monthIndex0, day, hour, minute, 0);

  const offsetMs = tzWallClockAsUTC - guessUTC;
  return new Date(utcGuess.getTime() - offsetMs);
}

function parseTimeOfDay(t: string): { hour: number; minute: number } | null {
  const m = /^(\d{2}):(\d{2})$/.exec((t || "").trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function startOfMonthUTC(year: number, monthIndex0: number) {
  return zonedWallClockToUtcDate(year, monthIndex0, 1, 0, 0, TZ);
}

function endOfMonthUTC(year: number, monthIndex0: number) {
  const lastDay = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  const dt = zonedWallClockToUtcDate(year, monthIndex0, lastDay, 23, 59, TZ);
  dt.setUTCSeconds(59, 999);
  return dt;
}

function clampDateOnlyRangeToMonth(
  orderStart: Date,
  orderEnd: Date | null,
  year: number,
  monthIndex0: number,
): {
  fromY: number;
  fromM0: number;
  fromD: number;
  toY: number;
  toM0: number;
  toD: number;
} | null {
  const monthFirstLocal = { y: year, m0: monthIndex0, d: 1 };
  const lastDay = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  const monthLastLocal = { y: year, m0: monthIndex0, d: lastDay };

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const toLocalYMD = (date: Date) => {
    const parts = dtf.formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value;
    return {
      y: Number(get("year")),
      m0: Number(get("month")) - 1,
      d: Number(get("day")),
    };
  };

  const s = toLocalYMD(orderStart);
  const e = orderEnd ? toLocalYMD(orderEnd) : null;

  const cmp = (a: any, b: any) => {
    if (a.y !== b.y) return a.y - b.y;
    if (a.m0 !== b.m0) return a.m0 - b.m0;
    return a.d - b.d;
  };

  const max = (a: any, b: any) => (cmp(a, b) >= 0 ? a : b);
  const min = (a: any, b: any) => (cmp(a, b) <= 0 ? a : b);

  const from = max(s, monthFirstLocal);
  const to = min(e ?? monthLastLocal, monthLastLocal);

  if (cmp(from, to) > 0) return null;

  return {
    fromY: from.y,
    fromM0: from.m0,
    fromD: from.d,
    toY: to.y,
    toM0: to.m0,
    toD: to.d,
  };
}

function* iterateDatesLocal(
  y: number,
  m0: number,
  d1: number,
  y2: number,
  m02: number,
  d2: number,
) {
  let cur = new Date(Date.UTC(y, m0, d1));
  const end = new Date(Date.UTC(y2, m02, d2));
  while (cur.getTime() <= end.getTime()) {
    yield {
      y: cur.getUTCFullYear(),
      m0: cur.getUTCMonth(),
      d: cur.getUTCDate(),
    };
    cur = new Date(
      Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate() + 1),
    );
  }
}

async function generateAndFetchMar(individualId: string, month: string) {
  const pm = parseMonth(month);
  if (!pm) {
    return {
      status: 400 as const,
      body: { error: "Invalid month format. Use YYYY-MM" },
    };
  }

  const { year, monthIndex0 } = pm;
  const monthStartUTC = startOfMonthUTC(year, monthIndex0);
  const monthEndUTC = endOfMonthUTC(year, monthIndex0);

  const orders = await prisma.medicationOrder.findMany({
    where: {
      individualId,
      status: "ACTIVE",
      startDate: { lte: monthEndUTC },
      OR: [{ endDate: null }, { endDate: { gte: monthStartUTC } }],
    },
    orderBy: [{ medicationName: "asc" }, { startDate: "asc" }],
  });

  const scheduledOrders = orders.filter(
    (o: any) =>
      o.type === "SCHEDULED" &&
      Array.isArray(o.timesOfDay) &&
      o.timesOfDay.length > 0,
  );

  if (scheduledOrders.length === 0) {
    const administrations = await prisma.medicationAdministration.findMany({
      where: {
        individualId,
        scheduledDateTime: { gte: monthStartUTC, lte: monthEndUTC },
      },
      orderBy: [{ scheduledDateTime: "asc" }],
    });

    return {
      status: 200 as const,
      body: { individualId, month, orders, administrations },
    };
  }

  const desired: Array<{
    orderId: string;
    individualId: string;
    scheduledDateTime: Date;
  }> = [];

  for (const o of scheduledOrders as any[]) {
    const range = clampDateOnlyRangeToMonth(
      o.startDate,
      o.endDate,
      year,
      monthIndex0,
    );
    if (!range) continue;

    // dedupe times
    const timeSet = new Set<string>();
    for (const t of o.timesOfDay) {
      const norm = String(t || "").trim();
      if (/^\d{2}:\d{2}$/.test(norm)) timeSet.add(norm);
    }

    const timeList: Array<{ hour: number; minute: number }> = [];
    for (const t of Array.from(timeSet)) {
      const parsed = parseTimeOfDay(t);
      if (parsed) timeList.push(parsed);
    }
    if (timeList.length === 0) continue;

    for (const d of iterateDatesLocal(
      range.fromY,
      range.fromM0,
      range.fromD,
      range.toY,
      range.toM0,
      range.toD,
    )) {
      for (const tm of timeList) {
        const scheduledUTC = zonedWallClockToUtcDate(
          d.y,
          d.m0,
          d.d,
          tm.hour,
          tm.minute,
          TZ,
        );
        desired.push({
          orderId: o.id,
          individualId,
          scheduledDateTime: scheduledUTC,
        });
      }
    }
  }

  const orderIds = scheduledOrders.map((o: any) => o.id);

  const existing = await prisma.medicationAdministration.findMany({
    where: {
      orderId: { in: orderIds },
      scheduledDateTime: { gte: monthStartUTC, lte: monthEndUTC },
    },
    select: { orderId: true, scheduledDateTime: true },
  });

  const key = (orderId: string, dt: Date) => `${orderId}__${dt.toISOString()}`;
  const existingSet = new Set(
    existing.map((e) => key(e.orderId, e.scheduledDateTime)),
  );

  const toCreate = desired.filter(
    (x) => !existingSet.has(key(x.orderId, x.scheduledDateTime)),
  );

  if (toCreate.length > 0) {
    try {
      await prisma.medicationAdministration.createMany({
        data: toCreate.map((x) => ({
          orderId: x.orderId,
          individualId: x.individualId,
          scheduledDateTime: x.scheduledDateTime,
          actualDateTime: null,
          status: GENERATED_STATUS, // ✅ null
          reason: null,
          vitalsSummary: null,
          staffId: null,
          staffName: null,
        })),
        skipDuplicates: true,
      });
    } catch (e) {
      await prisma.$transaction(
        toCreate.map((x) =>
          prisma.medicationAdministration
            .create({
              data: {
                orderId: x.orderId,
                individualId: x.individualId,
                scheduledDateTime: x.scheduledDateTime,
                actualDateTime: null,
                status: GENERATED_STATUS, // ✅ null
                reason: null,
                vitalsSummary: null,
                staffId: null,
                staffName: null,
              },
            })
            .catch(() => null),
        ),
      );
    }
  }

  const administrations = await prisma.medicationAdministration.findMany({
    where: {
      individualId,
      scheduledDateTime: { gte: monthStartUTC, lte: monthEndUTC },
    },
    orderBy: [{ scheduledDateTime: "asc" }],
  });

  return {
    status: 200 as const,
    body: {
      individualId,
      month,
      orders,
      administrations,
      meta: {
        tz: TZ,
        monthStartUTC: monthStartUTC.toISOString(),
        monthEndUTC: monthEndUTC.toISOString(),
        created: toCreate.length,
      },
    },
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const individualId = (searchParams.get("individualId") || "").trim();
    const month = (searchParams.get("month") || "").trim();

    if (!individualId) {
      return NextResponse.json(
        { error: "Missing individualId" },
        { status: 400 },
      );
    }
    if (!month) {
      return NextResponse.json({ error: "Missing month" }, { status: 400 });
    }

    const result = await generateAndFetchMar(individualId, month);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    console.error("GET /api/medication/mar error:", err);
    return NextResponse.json(
      { error: "Internal error", details: String(err?.message || err) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const individualId = (body?.individualId || "").trim();
    const month = (body?.month || "").trim();

    if (!individualId) {
      return NextResponse.json(
        { error: "Missing individualId" },
        { status: 400 },
      );
    }
    if (!month) {
      return NextResponse.json({ error: "Missing month" }, { status: 400 });
    }

    const result = await generateAndFetchMar(individualId, month);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    console.error("POST /api/medication/mar error:", err);
    return NextResponse.json(
      { error: "Internal error", details: String(err?.message || err) },
      { status: 500 },
    );
  }
}
