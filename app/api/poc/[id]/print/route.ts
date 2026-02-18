// web/app/api/poc/[id]/print/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function escapeHtml(input: any) {
  const s = String(input ?? "");
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function fmtDateMMDDYYYY(d: any) {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt?.getTime?.())) return "";
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const yyyy = String(dt.getFullYear());
  return `${mm}/${dd}/${yyyy}`;
}

function fmtDateTimeMMDDYYYY_hhmm(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  let hh = d.getHours();
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12;
  if (hh === 0) hh = 12;
  const hhs = String(hh).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd}/${yyyy} ${hhs}:${mins} ${ampm}`;
}

function normalizeDays(daysOfWeek: any): Set<string> {
  const set = new Set<string>();
  if (!daysOfWeek) return set;

  const mapNum: Record<number, string> = {
    0: "SUN",
    1: "MON",
    2: "TUE",
    3: "WED",
    4: "THU",
    5: "FRI",
    6: "SAT",
    7: "SUN",
  };

  const pushToken = (t: string) => {
    const x = t.trim().toUpperCase();
    if (!x) return;
    if (x.startsWith("SU")) return set.add("SUN");
    if (x.startsWith("MO")) return set.add("MON");
    if (x.startsWith("TU")) return set.add("TUE");
    if (x.startsWith("WE")) return set.add("WED");
    if (x.startsWith("TH")) return set.add("THU");
    if (x.startsWith("FR")) return set.add("FRI");
    if (x.startsWith("SA")) return set.add("SAT");
  };

  if (Array.isArray(daysOfWeek)) {
    for (const v of daysOfWeek) {
      if (typeof v === "number") set.add(mapNum[v] ?? "");
      else pushToken(String(v));
    }
  } else if (typeof daysOfWeek === "object") {
    for (const [k, v] of Object.entries(daysOfWeek)) {
      if (!v) continue;
      pushToken(k);
    }
  } else {
    const parts = String(daysOfWeek).split(/[,;/\s]+/g);
    for (const p of parts) pushToken(p);
  }

  if (set.has("")) set.delete("");
  return set;
}

function hasAnyCheckedDay(days: Set<string>) {
  return (
    days.has("SUN") ||
    days.has("MON") ||
    days.has("TUE") ||
    days.has("WED") ||
    days.has("THU") ||
    days.has("FRI") ||
    days.has("SAT")
  );
}

export async function GET(_req: Request, ctx: any) {
  try {
    const params = (await ctx?.params) ?? {};
    const id = String(params?.id ?? "").trim();
    if (!id) return new NextResponse("Missing id", { status: 400 });

    const poc = await (prisma as any).poc.findUnique({
      where: { id },
      include: {
        individual: true,
        duties: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!poc) return new NextResponse("POC not found", { status: 404 });

    const now = new Date();

    // Company block (static)
    const companyName = "BLUE ANGELS CARE";
    const vendorName = "Blue Angels Care LLC";
    const officeName = "Blue Angels Care LLC";
    const officePhone = "8146002313";

    const individual = poc.individual ?? null;

    const admissionId =
      (individual?.code && String(individual.code).trim()) ||
      (individual?.medicaidId && String(individual.medicaidId).trim()) ||
      "";

    const patientName = (() => {
      const first = String(individual?.firstName ?? "").trim();
      const last = String(individual?.lastName ?? "").trim();
      const label = `${last} ${first}`.trim();
      if (label) return label.toUpperCase();
      const name = String(individual?.name ?? "").trim();
      return name ? name.toUpperCase() : "";
    })();

    const patientDob = fmtDateMMDDYYYY(individual?.dob ?? individual?.dateOfBirth);
    const patientPhone = String(individual?.phone ?? individual?.phone1 ?? "").trim();

    const addr1 = String(
      individual?.address1 ?? individual?.address ?? individual?.street ?? ""
    ).trim();
    const city = String(individual?.city ?? "").trim();
    const state = String(individual?.state ?? "").trim();
    const zip = String(individual?.zip ?? individual?.postalCode ?? "").trim();
    const addressLine = [addr1].filter(Boolean).join(" ");
    const addressLine2 = [city, state, zip].filter(Boolean).join(" ");

    const pocIdDisplay = String(poc.pocNumber ?? poc.id ?? "").trim();
    const shift = String(poc.shift ?? "All").trim();
    const startDate = fmtDateMMDDYYYY(poc.startDate);
    const stopDate = fmtDateMMDDYYYY(poc.stopDate);

    // ✅ ONLY print duties that have at least 1 checked day (SUN..SAT)
    const dutyRows = (poc.duties ?? [])
      .map((d: any) => {
        const days = normalizeDays(d.daysOfWeek);
        return { d, days };
      })
      .filter(({ d, days }) => {
        if (!hasAnyCheckedDay(days)) return false;

        const category = String(d?.category ?? "").trim();
        const taskNo = d?.taskNo == null ? "" : String(d.taskNo).trim();
        const desc = String(d?.duty ?? d?.description ?? "").trim();
        return Boolean(category && (taskNo || desc));
      })
      .map(({ d, days }) => {
        const timesWeek =
          d.timesWeekMin == null && d.timesWeekMax == null
            ? ""
            : d.timesWeekMin != null && d.timesWeekMax != null
              ? `${d.timesWeekMin}-${d.timesWeekMax}`
              : d.timesWeekMin != null
                ? `${d.timesWeekMin}`
                : `${d.timesWeekMax}`;

        return {
          category: String(d.category ?? "").trim(),
          taskNo: d.taskNo == null ? "" : String(d.taskNo),
          description: String(d.duty ?? d.description ?? "").trim(),
          minutes: d.minutes == null ? "" : String(d.minutes),
          instruction: String(d.instruction ?? "").trim(),
          asNeeded: d.asNeeded ? "Yes" : "No",
          timesWeek,
          days,
        };
      });

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>POC Print</title>
  <style>
@page { size: Letter; margin: 18px; }
body { font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; }

.page { width: 100%; font-size: 13px; }
.title { text-align:center; flex: 1; font-size: 22px; font-weight: 700; margin-top: 4px; }
.meta { text-align:right; font-size: 13px; margin-top: 6px; }

.top-row { display: flex; align-items: flex-start; justify-content: space-between; }
.brand { display:flex; align-items:flex-start; justify-content:flex-start; }

/* ✅ Company name: no box, left aligned */
.logo-text {
  font-weight: 800;
  font-size: 22px;            /* same as title */
  letter-spacing: 0.6px;
  color: #0B2E6B;             /* dark blue */
  white-space: nowrap;        /* force 1 line */
  line-height: 1.0;
  margin-top: 2px;
}

.box { border: 2px solid #000; padding: 10px 12px; margin-top: 10px; }
.box .center-line { text-align:center; font-size: 14px; font-weight: 700; }
.box .line { text-align:center; font-size: 13px; margin-top: 4px; }
.box .line b { font-weight: 700; }

.grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.row { display:flex; gap: 10px; align-items: baseline; font-size: 13px; }
.row .label { width: 120px; font-weight: 700; }
.row .value { flex: 1; border-bottom: 1px solid #000; min-height: 14px; padding-bottom: 2px; }

.divider { border-top: 2px solid #000; margin: 10px 0; }

.section-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
.section-row { display:flex; gap: 10px; font-size: 13px; }
.section-row .label { width: 140px; font-weight: 700; }
.section-row .blank { flex: 1; border-bottom: 1px solid #000; min-height: 14px; }

table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
th, td { border: 1px solid #000; padding: 5px 6px; vertical-align: top; }
th { background: #e6e6e6; font-weight: 700; text-align: left; }

.col-cat { width: 120px; }
.col-task { width: 75px; }
.col-desc { width: auto; }
.col-min { width: 55px; text-align:center; }
.col-inst { width: 150px; }
.col-asn { width: 90px; text-align:center; }
.col-tw { width: 75px; text-align:center; }
.col-d { width: 30px; text-align:center; }

/* ✅ Completed Status columns */
.col-cs { width: 92px; text-align:center; background:#fff; }
.cs-head { text-align:center; }
.cs-sub { font-style: italic; font-weight: 400; background:#fff; }

/* ✅ Clickable completed status cells print reliably (text ✓) */
.cs-click { cursor: pointer; user-select: none; }
.cs-mark { font-size: 14px; font-weight: 700; }
@media print { .cs-click { cursor: default; } }

.footnote { font-size: 11px; text-align:center; margin-top: 10px; }
.note-box { border: 2px solid #000; padding: 8px 10px; margin-top: 10px; font-size: 12px; }
.note-title { font-weight: 700; margin-bottom: 6px; }
.note-text { text-align:center; font-weight: 700; }
.note-sub { text-align:center; font-weight: 700; margin-top: 6px; }
.tight { line-height: 1.15; }
  </style>
</head>
<body>
  <div class="page">

    <div class="top-row">
      <div class="brand">
        <div class="logo-text">${escapeHtml(companyName)}</div>
      </div>

      <div class="title">Plan of Care (POC)</div>

      <div class="meta tight">
        <div class="page-no">Page 1 of 1</div>
        <div>Report Date:&nbsp; ${escapeHtml(fmtDateTimeMMDDYYYY_hhmm(now))}</div>
      </div>
    </div>

    <div class="box">
      <div class="center-line">Vendor:&nbsp; ${escapeHtml(vendorName)}</div>
      <div class="line"><b>Office:</b>&nbsp; ${escapeHtml(officeName)}</div>
      <div class="line"><b>Office Phone No :</b>&nbsp; ${escapeHtml(officePhone)}</div>
      <div class="line" style="margin-top:8px;"><b>POC Frequency :</b></div>
    </div>

    <div class="grid2">
      <div class="row"><div class="label">Admission ID:</div><div class="value">${escapeHtml(admissionId)}</div></div>
      <div class="row"><div class="label">POC ID:</div><div class="value">${escapeHtml(pocIdDisplay)}</div></div>

      <div class="row"><div class="label">Shift:</div><div class="value">${escapeHtml(shift)}</div></div>
      <div class="row"><div class="label"></div><div class="value" style="border-bottom:0;"></div></div>

      <div class="row"><div class="label">Start Date:</div><div class="value">${escapeHtml(startDate)}</div></div>
      <div class="row"><div class="label">Stop Date:</div><div class="value">${escapeHtml(stopDate)}</div></div>
    </div>

    <div class="divider"></div>

    <div class="grid2">
      <div class="row"><div class="label">Patient Name:</div><div class="value">${escapeHtml(patientName)}</div></div>
      <div class="row"><div class="label">Patient DOB (Age):</div><div class="value">${escapeHtml(patientDob)}</div></div>

      <div class="row"><div class="label">Address:</div><div class="value">${escapeHtml(addressLine)}</div></div>
      <div class="row"><div class="label">Patient Phone #:</div><div class="value">${escapeHtml(patientPhone)}</div></div>

      <div class="row"><div class="label"></div><div class="value">${escapeHtml(addressLine2)}</div></div>
      <div class="row"><div class="label"></div><div class="value" style="border-bottom:0;"></div></div>
    </div>

    <div class="section-grid">
      <div class="section-row"><div class="label">Advanced Directives:</div><div class="blank"></div></div>
      <div class="section-row"><div class="label">Allergies:</div><div class="blank"></div></div>

      <div class="section-row"><div class="label">Emergency Contact:</div><div class="blank"></div></div>
      <div class="section-row"><div class="label">Emergency Contact Phone #:</div><div class="blank"></div></div>

      <div class="section-row"><div class="label">Physician:</div><div class="blank"></div></div>
      <div class="section-row"><div class="label">Physician Phone #:</div><div class="blank"></div></div>

      <div class="section-row"><div class="label">Nurse:</div><div class="blank"></div></div>
      <div class="section-row"><div class="label">Contract Name:</div><div class="blank">ODP</div></div>

      <div class="section-row"><div class="label">Mental Status:</div><div class="blank"></div></div>
      <div class="section-row"><div class="label">Nutritional Requirements:</div><div class="blank"></div></div>

      <div class="section-row"><div class="label">Safety Measures:</div><div class="blank"></div></div>
      <div class="section-row"><div class="label">DME & Supplies:</div><div class="blank"></div></div>

      <div class="section-row"><div class="label">Functional Limitations:</div><div class="blank"></div></div>
      <div class="section-row"><div class="label">Activities Permitted:</div><div class="blank"></div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="col-cat" rowspan="2">Category</th>
          <th class="col-task" rowspan="2">Task<br/>Number</th>
          <th class="col-desc" rowspan="2">Description</th>
          <th class="col-min" rowspan="2">Min.</th>
          <th class="col-inst" rowspan="2">Instruction</th>
          <th class="col-asn" rowspan="2">As<br/>Requested</th>
          <th class="col-tw" rowspan="2">Times a<br/>Week</th>

          <th class="col-d" rowspan="2">S</th>
          <th class="col-d" rowspan="2">M</th>
          <th class="col-d" rowspan="2">T</th>
          <th class="col-d" rowspan="2">W</th>
          <th class="col-d" rowspan="2">T</th>
          <th class="col-d" rowspan="2">F</th>
          <th class="col-d" rowspan="2">S</th>

          <th class="cs-head" colspan="4">Completed Status</th>
        </tr>
        <tr>
          <th class="col-cs cs-sub">Independent</th>
          <th class="col-cs cs-sub">Verbal Prompt</th>
          <th class="col-cs cs-sub">Physical Assist</th>
          <th class="col-cs cs-sub">Refused</th>
        </tr>
      </thead>
      <tbody>
        ${
          dutyRows.length
            ? dutyRows
                .map((r, idx) => {
                  const Y = (k: string) => (r.days?.has(k) ? "Y" : "");
                  return `<tr>
  <td>${escapeHtml(r.category)}</td>
  <td>${escapeHtml(r.taskNo)}</td>
  <td>${escapeHtml(r.description)}</td>
  <td class="col-min">${escapeHtml(r.minutes)}</td>
  <td>${escapeHtml(r.instruction)}</td>
  <td class="col-asn">${escapeHtml(r.asNeeded)}</td>
  <td class="col-tw">${escapeHtml(r.timesWeek)}</td>

  <!-- ✅ Print-friendly: Y for checked, blank for unchecked -->
  <td class="col-d">${Y("SUN")}</td>
  <td class="col-d">${Y("MON")}</td>
  <td class="col-d">${Y("TUE")}</td>
  <td class="col-d">${Y("WED")}</td>
  <td class="col-d">${Y("THU")}</td>
  <td class="col-d">${Y("FRI")}</td>
  <td class="col-d">${Y("SAT")}</td>

  <!-- ✅ Click to mark ✓ (prints reliably) -->
  <td class="col-cs cs-click" data-group="cs-${idx}" data-value="Independent"></td>
  <td class="col-cs cs-click" data-group="cs-${idx}" data-value="Verbal"></td>
  <td class="col-cs cs-click" data-group="cs-${idx}" data-value="Physical"></td>
  <td class="col-cs cs-click" data-group="cs-${idx}" data-value="Refused"></td>
</tr>`;
                })
                .join("\n")
            : `<tr><td colspan="18" style="text-align:center;">No duties</td></tr>`
        }
      </tbody>
    </table>

    <div class="footnote tight">
      When entering the Task Number via the Phone System, press the POUND KEY (#) after each entry to speed up the task-entry process.
    </div>

    <div class="note-box">
      <div class="note-title">POC Note:</div>
      <div class="note-text">CALL 911 FOR MEDICAL EMERGENCIES OR FALLS AND THEN NOTIFY THE HOME CARE AGENCY AT THE OFFICE PHONE</div>
      <div class="note-sub">LISTED ABOVE</div>
    </div>

  </div>

  <script>
  (function () {
    function clearGroup(group) {
      var cells = document.querySelectorAll('td.cs-click[data-group="' + group + '"]');
      cells.forEach(function (c) { c.textContent = ""; c.classList.remove("cs-mark"); });
    }

    document.addEventListener("click", function (e) {
      var td = e.target && e.target.closest ? e.target.closest("td.cs-click") : null;
      if (!td) return;

      var group = td.getAttribute("data-group") || "";
      if (!group) return;

      // toggle: if already marked -> clear; else mark and clear others
      if (td.textContent && td.textContent.trim() !== "") {
        td.textContent = "";
        td.classList.remove("cs-mark");
        return;
      }

      clearGroup(group);

      // ✅ mark for print (text is always printed)
      td.textContent = "✓"; // change to "V" if you prefer
      td.classList.add("cs-mark");
    });
  })();
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("GET /api/poc/[id]/print error:", e);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
