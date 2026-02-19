// web/app/api/poc/daily/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function dayBoundsUtc(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  return { start, end };
}

// Replace any Unicode dash/minus with normal hyphen '-'
function normalizeHyphen(input: string) {
  if (!input) return input;
  return input
    .trim()
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-");
}

type ActionType = "SAVE_DRAFT" | "SUBMIT";

type IncomingTask = {
  pocDutyId: string;
  completionStatus?: string | null; // enum in DB: poc_duty_completion_status
  note?: string | null;
};

async function findActivePoc(individualId: string, dateStr: string) {
  const bounds = dayBoundsUtc(dateStr);
  if (!bounds) return { bounds: null as any, poc: null as any };

  const { start, end } = bounds;

  const poc = await prisma.poc.findFirst({
    where: {
      individualId,
      startDate: { lte: end },
      OR: [{ stopDate: null }, { stopDate: { gte: start } }],
    },
    include: {
      duties: { orderBy: [{ sortOrder: "asc" }, { taskNo: "asc" }] },
    },
    orderBy: { startDate: "desc" },
  });

  return { bounds, poc };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const individualId = (searchParams.get("individualId") || "").trim();
    const dateStr = (searchParams.get("date") || "").trim();

    if (!individualId || !dateStr) {
      return NextResponse.json(
        { error: "individualId and date are required" },
        { status: 400 }
      );
    }

    const bounds = dayBoundsUtc(dateStr);
    if (!bounds) {
      return NextResponse.json(
        { error: "date must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const { start, end } = bounds;

    // Robust active POC lookup by full-day bounds (avoid tz issues)
    const poc = await prisma.poc.findFirst({
      where: {
        individualId,
        startDate: { lte: end },
        OR: [{ stopDate: null }, { stopDate: { gte: start } }],
      },
      include: {
        duties: { orderBy: [{ sortOrder: "asc" }, { taskNo: "asc" }] },
      },
      orderBy: { startDate: "desc" },
    });

    if (!poc) {
      return NextResponse.json({
        poc: null,
        duties: [],
        dailyLog: null,
        message: "No active POC found for this date",
        debug: { individualId, dateStr, start, end },
      });
    }

    // Try load daily log from Phase-1 SQL tables (may not exist in Prisma schema)
    let dailyLog: any = null;
    try {
      const dateOnly = dateStr; // DATE column, keep as yyyy-mm-dd string
      const rows = await prisma.$queryRaw<
        any[]
      >(Prisma.sql`
        select
          l.*,
          coalesce(
            json_agg(t.* order by t."createdat" asc) filter (where t."id" is not null),
            '[]'::json
          ) as tasks
        from public.poc_daily_log l
        left join public.poc_daily_task_log t
          on t."dailylogid" = l."id"
        where l."pocid" = ${poc.id}
          and l."individualid" = ${individualId}
          and l."date" = ${dateOnly}::date
        group by l."id"
        limit 1
      `);

      dailyLog = rows?.[0] || null;
    } catch {
      dailyLog = null;
    }

    return NextResponse.json({
      poc,
      duties: poc.duties,
      dailyLog,
    });
  } catch (error) {
    console.error("GET /api/poc/daily error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const action = (body?.action || "") as ActionType;
    const individualId = (body?.individualId || "").trim();
    const dateStr = (body?.date || "").trim();
    const dspId = (body?.dspId || "").trim();
    const tasks = (Array.isArray(body?.tasks) ? body.tasks : []) as IncomingTask[];

    if (!action || !["SAVE_DRAFT", "SUBMIT"].includes(action)) {
      return NextResponse.json(
        { error: "action must be SAVE_DRAFT or SUBMIT" },
        { status: 400 }
      );
    }

    if (!individualId || !dateStr || !dspId) {
      return NextResponse.json(
        { error: "individualId, date, dspId are required" },
        { status: 400 }
      );
    }

    const bounds = dayBoundsUtc(dateStr);
    if (!bounds) {
      return NextResponse.json(
        { error: "date must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Find active POC for the date
    const { poc } = await findActivePoc(individualId, dateStr);
    if (!poc) {
      return NextResponse.json(
        { error: "No active POC found for this date" },
        { status: 404 }
      );
    }

    // Normalize duty ids (fix unicode dash issue)
    const normalizedTasks = tasks.map((t) => ({
      ...t,
      pocDutyId: normalizeHyphen(String(t?.pocDutyId || "")),
      completionStatus: t?.completionStatus ?? null,
      note: t?.note ?? null,
    }));

    const dutyIds = Array.from(
      new Set(
        normalizedTasks
          .map((t) => t.pocDutyId)
          .filter((x) => typeof x === "string" && x.trim().length > 0)
      )
    );

    if (dutyIds.length === 0) {
      return NextResponse.json(
        { error: "tasks must include at least 1 valid pocDutyId" },
        { status: 400 }
      );
    }

    // Validate dutyIds exist and belong to this POC
    // NOTE: Prisma model name may differ; so we validate using raw SQL against public.poc_duty.
    const validDutyRows = await prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`
        select d."id"
        from public.poc_duty d
        where d."pocid" = ${poc.id}
          and d."id" = any(${dutyIds}::text[])
      `
    );
    const validSet = new Set(validDutyRows.map((r) => r.id));
    const invalidPocDutyIds = dutyIds.filter((id) => !validSet.has(id));

    if (invalidPocDutyIds.length > 0) {
      return NextResponse.json(
        {
          error: "Some pocDutyId do not exist or do not belong to this POC",
          invalidPocDutyIds,
          debug: { pocId: poc.id, count: invalidPocDutyIds.length },
          tip: "Make sure pocDutyId uses normal '-' hyphen (not '–' en-dash). API already normalizes, but your payload may still include unexpected characters.",
        },
        { status: 400 }
      );
    }

    const dateOnly = dateStr; // DATE column
    const now = new Date();
    const dailyLogId = crypto.randomUUID();
    const dailyStatus = action === "SUBMIT" ? "SUBMITTED" : "DRAFT";
    const submittedAt = action === "SUBMIT" ? now : null;

    // Upsert daily log (unique: (pocid, dspid, date))
    const dailyLogRows = await prisma.$queryRaw<any[]>(
      Prisma.sql`
        insert into public.poc_daily_log
          ("id","pocid","individualid","dspid","date","status","submittedat","createdat","updatedat")
        values
          (${dailyLogId}, ${poc.id}, ${individualId}, ${dspId}, ${dateOnly}::date, ${dailyStatus}::public.poc_daily_log_status, ${submittedAt}, now(), now())
        on conflict (pocid, dspid, date)
        do update set
          status = excluded.status,
          submittedat = coalesce(excluded.submittedat, public.poc_daily_log.submittedat),
          updatedat = now()
        returning *
      `
    );

    const savedDailyLog = dailyLogRows?.[0];
    const savedDailyLogId = savedDailyLog?.id;

    if (!savedDailyLogId) {
      return NextResponse.json(
        { error: "Failed to save daily log" },
        { status: 500 }
      );
    }

    // Replace all task rows for this daily log (simple + safe)
    await prisma.$executeRaw(
      Prisma.sql`delete from public.poc_daily_task_log where "dailylogid" = ${savedDailyLogId}`
    );

    for (const t of normalizedTasks) {
      const rowId = crypto.randomUUID();
      const completion = t.completionStatus ? String(t.completionStatus) : "INDEPENDENT";
      const note = t.note ? String(t.note) : null;
      const completedAt = action === "SUBMIT" ? now : null;

      await prisma.$executeRaw(
        Prisma.sql`
          insert into public.poc_daily_task_log
            ("id","dailylogid","pocdutyid","completionstatus","completedat","note","createdat","updatedat")
          values
            (${rowId}, ${savedDailyLogId}, ${t.pocDutyId}, ${completion}::public.poc_duty_completion_status, ${completedAt}, ${note}, now(), now())
        `
      );
    }

    // Return saved daily log + tasks
    const resultRows = await prisma.$queryRaw<any[]>(
      Prisma.sql`
        select
          l.*,
          coalesce(
            json_agg(t.* order by t."createdat" asc) filter (where t."id" is not null),
            '[]'::json
          ) as tasks
        from public.poc_daily_log l
        left join public.poc_daily_task_log t
          on t."dailylogid" = l."id"
        where l."id" = ${savedDailyLogId}
        group by l."id"
        limit 1
      `
    );

    return NextResponse.json({
      ok: true,
      action,
      pocId: poc.id,
      dailyLog: resultRows?.[0] || savedDailyLog,
    });
  } catch (error: any) {
    console.error("POST /api/poc/daily error:", error);

    // Try to bubble useful Prisma raw error message
    const detail =
      typeof error?.message === "string" ? error.message : String(error);

    return NextResponse.json(
      { error: "Internal server error", detail },
      { status: 500 }
    );
  }
}
