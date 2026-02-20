// web/app/api/poc/dsp-names/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function jsonOk(map: Record<string, string>) {
  return NextResponse.json({ ok: true, map });
}
function jsonErr(status: number, error: string, detail?: string) {
  return NextResponse.json({ ok: false, error, detail }, { status });
}

function normalizeName(first?: any, last?: any, full?: any) {
  const f = String(first ?? "").trim();
  const l = String(last ?? "").trim();
  const x = String(full ?? "").trim();
  const out = `${f} ${l}`.trim();
  return out || x || "";
}

async function tryReadEmployeesSnake(ids: string[]) {
  // best guess: public.employee(id, firstname, lastname) OR public.employee(id, first_name, last_name)
  const sqls = [
    `
    SELECT e.id, e.firstname AS "firstName", e.lastname AS "lastName", NULL::text AS "fullName"
    FROM public.employee e
    WHERE e.id = ANY($1::text[])
    `,
    `
    SELECT e.id, e.first_name AS "firstName", e.last_name AS "lastName", NULL::text AS "fullName"
    FROM public.employee e
    WHERE e.id = ANY($1::text[])
    `,
  ];

  for (const sql of sqls) {
    try {
      const rows = (await prisma.$queryRawUnsafe(sql, ids)) as any[];
      if (Array.isArray(rows) && rows.length) return rows;
    } catch {
      // ignore
    }
  }
  return [] as any[];
}

async function tryReadEmployeesCamel(ids: string[]) {
  // best guess: public."Employee"(id, "firstName", "lastName") OR has "name"
  const sqls = [
    `
    SELECT e.id, e."firstName" AS "firstName", e."lastName" AS "lastName", NULL::text AS "fullName"
    FROM public."Employee" e
    WHERE e.id = ANY($1::text[])
    `,
    `
    SELECT e.id, NULL::text AS "firstName", NULL::text AS "lastName", e.name AS "fullName"
    FROM public."Employee" e
    WHERE e.id = ANY($1::text[])
    `,
  ];

  for (const sql of sqls) {
    try {
      const rows = (await prisma.$queryRawUnsafe(sql, ids)) as any[];
      if (Array.isArray(rows) && rows.length) return rows;
    } catch {
      // ignore
    }
  }
  return [] as any[];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = (searchParams.get("ids") || "").trim();
    if (!idsParam) return jsonOk({});

    const ids = Array.from(
      new Set(
        idsParam
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      )
    );

    if (!ids.length) return jsonOk({});

    // Try snake then camel
    const rows = [
      ...(await tryReadEmployeesSnake(ids)),
      ...(await tryReadEmployeesCamel(ids)),
    ];

    const map: Record<string, string> = {};
    for (const r of rows) {
      const id = String(r?.id || "").trim();
      if (!id) continue;
      if (map[id]) continue;
      const name = normalizeName(r?.firstName, r?.lastName, r?.fullName);
      if (name) map[id] = name;
    }

    // fallback: show id if not found
    ids.forEach((id) => {
      if (!map[id]) map[id] = id;
    });

    return jsonOk(map);
  } catch (e: any) {
    return jsonErr(500, "Server error", String(e?.message || e));
  }
}
