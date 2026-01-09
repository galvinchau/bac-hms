"use client";

import React, { useEffect, useMemo, useState } from "react";

type MeResponse = {
  user?: {
    id?: string;
    email?: string | null;
    userType?: string | null; // "ADMIN" | "OFFICE" | "HR" | "STAFF" | ...
  } | null;

  employee?: EmployeeProfile | null;
};

type EmployeeProfile = {
  staffId: string; // Employee.employeeId (BAC-E-...)
  firstName: string;
  lastName: string;
  position: string;
  address: string;
  phone: string;
  email: string;
};

type TKStatus = {
  staffId: string;
  staffName: string;
  role: "OFFICE";
  isCheckedIn: boolean;
  activeSessionId?: string | null;

  lastCheckInAt?: string | null;
  lastCheckOutAt?: string | null;

  lastLat?: number | null;
  lastLng?: number | null;
  lastAccuracy?: number | null;

  serverTime?: string | null; // ISO now
};

type AttendanceRow = {
  id: string;
  staffId: string;
  staffName: string;

  checkInAt: string;
  checkOutAt: string | null;
  totalMinutes: number | null;

  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;

  source: "MOBILE" | "WEB";
  flags: string[];
};

type ApprovalStatus = "PENDING" | "APPROVED";

type DailySummaryRow = {
  date: string; // YYYY-MM-DD
  computedMinutes: number;
  adjustedMinutes: number | null;
  resultMinutes: number;
};

type WeeklyApprovalRow = {
  staffId: string;
  name: string;
  position: string;

  computedMinutes: number;
  adjustedMinutes: number | null; // legacy
  finalMinutes: number;

  status: ApprovalStatus;
  approvedBy?: string | null; // email (legacy)
  approvedByName?: string | null; // ✅ NEW
  approvedAt?: string | null;

  flagsCount: number;

  // detail-only
  daily?: DailySummaryRow[];
  totalAfterAdjustedMinutes?: number;
};

type WeeklyDetailResponse = {
  row: WeeklyApprovalRow;
  attendance: AttendanceRow[];
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatMMDDYYYYFromDate(d: Date) {
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`;
}

function fmtDateTimeMMDD(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${formatMMDDYYYYFromDate(d)} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function fmtDateMMDDFromYYYYMMDD(yyyyMMdd?: string | null) {
  if (!yyyyMMdd) return "-";
  const parts = yyyyMMdd.split("-");
  if (parts.length !== 3) return yyyyMMdd;
  const [y, m, d] = parts;
  return `${m}/${d}/${y}`;
}

function fmtNum(n?: number | null, digits = 6) {
  if (n === null || n === undefined) return "-";
  if (Number.isNaN(n)) return "-";
  return n.toFixed(digits);
}

// ✅ Show minutes as "1h 09m"
function minutesToHhMm(mins?: number | null) {
  if (mins === null || mins === undefined) return "-";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${pad2(m)}m`;
}

function minutesToHoursDecimal(mins?: number | null) {
  if (mins === null || mins === undefined) return 0;
  return mins / 60;
}

async function getBrowserLocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported on this device/browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => reject(new Error(err.message || "Failed to get GPS location.")),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
}

function chipClass(status: ApprovalStatus) {
  return status === "APPROVED"
    ? "border-bac-border bg-bac-bg text-bac-text"
    : "border-bac-border bg-bac-panel text-yellow-200";
}

function safeJson<T>(x: any, fallback: T): T {
  try {
    return x as T;
  } catch {
    return fallback;
  }
}

function isOfficePosition(position?: string | null) {
  const p = (position || "").trim().toLowerCase();
  return p.includes("office");
}

type Ctx = {
  userEmail: string;
  userType: string;
  userId: string;
};

function parseAdjustInputToMinutes(s: string): number | null {
  const t = (s || "").trim();
  if (!t) return null;

  // Accept HH:MM or H:MM
  const m = t.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/);
  if (m) {
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || mm < 0)
      return null;
    return hh * 60 + mm;
  }

  // Accept decimal hours like "1.25"
  const n = Number(t);
  if (Number.isFinite(n) && n >= 0) return Math.round(n * 60);

  return null;
}

function formatISOToMMDD(d: string) {
  return fmtDateMMDDFromYYYYMMDD(d);
}

export default function TimeKeepingPage() {
  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "";

  const [meLoading, setMeLoading] = useState(true);
  const [meError, setMeError] = useState<string | null>(null);

  const [meUser, setMeUser] = useState<{
    id?: string;
    email?: string | null;
    userType?: string | null;
  } | null>(null);

  const [userType, setUserType] = useState<string | null>(null);
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);

  const [status, setStatus] = useState<TKStatus | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"CHECKIN" | "CHECKOUT" | "REFRESH" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const [weekStartISO, setWeekStartISO] = useState<string>(() => {
    const now = new Date();
    const day = now.getDay(); // Sun=0
    const start = new Date(now);
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return start.toISOString().slice(0, 10);
  });

  const [weekEndISO, setWeekEndISO] = useState<string>(() => {
    const now = new Date();
    const day = now.getDay();
    const s = new Date(now);
    s.setDate(now.getDate() - day);
    s.setHours(0, 0, 0, 0);
    const end = new Date(s);
    end.setDate(s.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end.toISOString().slice(0, 10);
  });

  const totalMinutes = useMemo(() => {
    return rows.reduce((sum, r) => sum + (r.totalMinutes || 0), 0);
  }, [rows]);

  function getTodayLabel(): string {
    const base = status?.serverTime ? new Date(status.serverTime) : new Date();
    const dayName = base.toLocaleDateString(undefined, { weekday: "long" });
    const dateStr = formatMMDDYYYYFromDate(base);
    const timeStr = base.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dayName} • ${dateStr} ${timeStr}`;
  }

  // ======== Approval state (REAL) ========
  const isApprover = userType === "ADMIN" || userType === "HR";

  const [approvalSearch, setApprovalSearch] = useState("");
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<
    "ALL" | ApprovalStatus
  >("ALL");

  const [weeklyApprovals, setWeeklyApprovals] = useState<WeeklyApprovalRow[]>(
    []
  );
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const filteredWeeklyApprovals = useMemo(() => {
    const q = approvalSearch.trim().toLowerCase();

    return weeklyApprovals.filter((r) => {
      const matchText =
        !q ||
        r.staffId.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.position.toLowerCase().includes(q);

      const matchStatus =
        approvalStatusFilter === "ALL"
          ? true
          : r.status === approvalStatusFilter;

      return matchText && matchStatus;
    });
  }, [weeklyApprovals, approvalSearch, approvalStatusFilter]);

  const approvalTotals = useMemo(() => {
    const computed = filteredWeeklyApprovals.reduce(
      (sum, r) => sum + r.computedMinutes,
      0
    );

    const final = filteredWeeklyApprovals.reduce((sum, r) => {
      const finalMin = r.finalMinutes ?? r.computedMinutes;
      return sum + (finalMin || 0);
    }, 0);

    const pending = filteredWeeklyApprovals.filter(
      (r) => r.status === "PENDING"
    ).length;
    const approved = filteredWeeklyApprovals.filter(
      (r) => r.status === "APPROVED"
    ).length;

    return { computed, final, pending, approved };
  }, [filteredWeeklyApprovals]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [activeApproval, setActiveApproval] =
    useState<WeeklyApprovalRow | null>(null);
  const [activeAttendance, setActiveAttendance] = useState<AttendanceRow[]>([]);
  const [dailyAdjustInputs, setDailyAdjustInputs] = useState<
    Record<string, string>
  >({});
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [modalBusy, setModalBusy] = useState<
    "LOAD" | "SAVE_ADJUST" | "APPROVE" | "UNLOCK" | null
  >(null);
  const [modalError, setModalError] = useState<string | null>(null);

  function closeReview() {
    setModalOpen(false);
    setActiveApproval(null);
    setActiveAttendance([]);
    setDailyAdjustInputs({});
    setAdjustReason("");
    setModalBusy(null);
    setModalError(null);
  }

  function getCtxOrThrow(): Ctx {
    const email = (meUser?.email || "").toString().trim();
    const id = (meUser?.id || "").toString().trim();
    const type = (meUser?.userType || userType || "").toString().trim();

    if (!email) {
      throw new Error(
        'Missing userEmail context. Please re-login ("/api/auth/me" must return user.email).'
      );
    }

    return {
      userEmail: email,
      userId: id || email,
      userType: type || "OFFICE",
    };
  }

  function appendCtxToSearchParams(qs: URLSearchParams, ctx: Ctx) {
    qs.set("userEmail", ctx.userEmail);
    qs.set("userType", ctx.userType);
    qs.set("userId", ctx.userId);
    return qs;
  }

  async function apiAdminListWeekly() {
    if (!isApprover) return;
    setApprovalLoading(true);
    setApprovalError(null);

    try {
      const ctx = getCtxOrThrow();

      const qs = new URLSearchParams({
        from: weekStartISO,
        to: weekEndISO,
        q: approvalSearch.trim(),
        status: approvalStatusFilter,
      });
      appendCtxToSearchParams(qs, ctx);

      const res = await fetch(`${API_BASE}/time-keeping/admin/weekly?${qs}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(
          `Failed to load weekly approvals (${res.status}). ${t || ""}`.trim()
        );
      }

      const json = (await res.json()) as any;

      const arr: any[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.rows)
        ? json.rows
        : [];

      const mapped: WeeklyApprovalRow[] = arr.map((x) => ({
        staffId: String(x.staffId ?? ""),
        name: String(x.name ?? x.staffName ?? ""),
        position: String(x.position ?? ""),
        computedMinutes: Number(x.computedMinutes ?? 0),
        adjustedMinutes:
          x.adjustedMinutes === null || x.adjustedMinutes === undefined
            ? null
            : Number(x.adjustedMinutes),
        finalMinutes: Number(x.finalMinutes ?? x.computedMinutes ?? 0),
        status: (String(x.status ?? "PENDING") as ApprovalStatus) || "PENDING",
        approvedBy: (x.approvedBy ?? x.approvedByEmail ?? null) as any,
        approvedByName: (x.approvedByName ?? null) as any,
        approvedAt: (x.approvedAt ?? null) as any,
        flagsCount: Number(x.flagsCount ?? 0),
      }));

      setWeeklyApprovals(mapped.filter((r) => !!r.staffId));
    } catch (e: any) {
      setApprovalError(e?.message || "Failed to load weekly approvals.");
      setWeeklyApprovals([]);
    } finally {
      setApprovalLoading(false);
    }
  }

  async function openReview(r: WeeklyApprovalRow) {
    setModalOpen(true);
    setActiveApproval(r);
    setActiveAttendance([]);
    setDailyAdjustInputs({});
    setModalBusy("LOAD");
    setModalError(null);

    try {
      const ctx = getCtxOrThrow();

      const qs = new URLSearchParams({
        from: weekStartISO,
        to: weekEndISO,
      });
      appendCtxToSearchParams(qs, ctx);

      const res = await fetch(
        `${API_BASE}/time-keeping/admin/weekly/${encodeURIComponent(
          r.staffId
        )}?${qs.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }
      );

      if (!res.ok) {
        const t = await res.text();
        throw new Error(
          `Failed to load weekly detail (${res.status}). ${t || ""}`.trim()
        );
      }

      const json = (await res.json()) as WeeklyDetailResponse;

      const row = (json?.row ?? (json as any)) as any;
      const attendance = (json?.attendance ?? []) as any[];

      const rowMapped: WeeklyApprovalRow = {
        staffId: String(row.staffId ?? r.staffId),
        name: String(row.name ?? row.staffName ?? r.name),
        position: String(row.position ?? r.position),
        computedMinutes: Number(row.computedMinutes ?? r.computedMinutes ?? 0),
        adjustedMinutes:
          row.adjustedMinutes === null || row.adjustedMinutes === undefined
            ? null
            : Number(row.adjustedMinutes),
        finalMinutes: Number(row.finalMinutes ?? r.finalMinutes ?? 0),
        totalAfterAdjustedMinutes: Number(row.totalAfterAdjustedMinutes ?? 0),
        status: (String(row.status ?? r.status) as ApprovalStatus) || "PENDING",
        approvedBy: (row.approvedBy ??
          row.approvedByEmail ??
          r.approvedBy ??
          null) as any,
        approvedByName: (row.approvedByName ?? r.approvedByName ?? null) as any,
        approvedAt: (row.approvedAt ?? r.approvedAt ?? null) as any,
        flagsCount: Number(row.flagsCount ?? r.flagsCount ?? 0),
        daily: Array.isArray(row.daily) ? (row.daily as any) : [],
      };

      const attMapped: AttendanceRow[] = Array.isArray(attendance)
        ? attendance.map((x) => safeJson<AttendanceRow>(x, x))
        : [];

      // init inputs from daily
      const initInputs: Record<string, string> = {};
      (rowMapped.daily || []).forEach((d) => {
        if (d.adjustedMinutes === null || d.adjustedMinutes === undefined) {
          initInputs[d.date] = "";
        } else {
          initInputs[d.date] = minutesToHhMm(Number(d.adjustedMinutes)).replace(
            "h ",
            ":"
          ); // rough display
          // Better: show HH:MM
          const mins = Number(d.adjustedMinutes);
          const hh = Math.floor(mins / 60);
          const mm = mins % 60;
          initInputs[d.date] = `${hh}:${pad2(mm)}`;
        }
      });

      setActiveApproval(rowMapped);
      setActiveAttendance(attMapped);
      setDailyAdjustInputs(initInputs);
      setAdjustReason("");
    } catch (e: any) {
      setModalError(e?.message || "Failed to load detail.");
    } finally {
      setModalBusy(null);
    }
  }

  async function apiAdminSaveAdjustment() {
    if (!activeApproval) return;
    setModalError(null);

    const daily = activeApproval.daily || [];
    const payloadDaily: Array<{ date: string; minutes: number | null }> = [];

    for (const d of daily) {
      const raw = dailyAdjustInputs[d.date] ?? "";
      const mins = parseAdjustInputToMinutes(raw);
      if (raw.trim() && mins === null) {
        setModalError(
          `Invalid Adjust value for ${formatISOToMMDD(
            d.date
          )}. Use HH:MM (e.g. 0:45) or decimal (e.g. 1.25).`
        );
        return;
      }
      payloadDaily.push({ date: d.date, minutes: mins });
    }

    setModalBusy("SAVE_ADJUST");
    try {
      const ctx = getCtxOrThrow();

      const res = await fetch(
        `${API_BASE}/time-keeping/admin/weekly/${encodeURIComponent(
          activeApproval.staffId
        )}/adjust`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            from: weekStartISO,
            to: weekEndISO,
            dailyAdjustments: payloadDaily,
            reason: adjustReason || "",
            userEmail: ctx.userEmail,
            userType: ctx.userType,
            userId: ctx.userId,
          }),
        }
      );

      if (!res.ok) {
        const t = await res.text();
        throw new Error(
          `Save adjustment failed (${res.status}). ${t || ""}`.trim()
        );
      }

      await apiAdminListWeekly();
      await openReview(activeApproval);
    } catch (e: any) {
      setModalError(e?.message || "Save adjustment failed.");
    } finally {
      setModalBusy(null);
    }
  }

  async function apiAdminApprove() {
    if (!activeApproval) return;
    setModalError(null);

    setModalBusy("APPROVE");
    try {
      const ctx = getCtxOrThrow();

      const res = await fetch(
        `${API_BASE}/time-keeping/admin/weekly/${encodeURIComponent(
          activeApproval.staffId
        )}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            from: weekStartISO,
            to: weekEndISO,
            reason: adjustReason || "",
            userEmail: ctx.userEmail,
            userType: ctx.userType,
            userId: ctx.userId,
          }),
        }
      );

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Approve failed (${res.status}). ${t || ""}`.trim());
      }

      await apiAdminListWeekly();
      await openReview(activeApproval);
    } catch (e: any) {
      setModalError(e?.message || "Approve failed.");
    } finally {
      setModalBusy(null);
    }
  }

  async function apiAdminUnlock() {
    if (!activeApproval) return;
    setModalError(null);

    if (!adjustReason || adjustReason.trim().length < 3) {
      setModalError("Unlock requires a reason (min 3 chars).");
      return;
    }

    setModalBusy("UNLOCK");
    try {
      const ctx = getCtxOrThrow();

      const res = await fetch(
        `${API_BASE}/time-keeping/admin/weekly/${encodeURIComponent(
          activeApproval.staffId
        )}/unlock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            from: weekStartISO,
            to: weekEndISO,
            reason: adjustReason,
            userEmail: ctx.userEmail,
            userType: ctx.userType,
            userId: ctx.userId,
          }),
        }
      );

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Unlock failed (${res.status}). ${t || ""}`.trim());
      }

      await apiAdminListWeekly();
      await openReview(activeApproval);
    } catch (e: any) {
      setModalError(e?.message || "Unlock failed.");
    } finally {
      setModalBusy(null);
    }
  }

  // ======== Auth/profile loader ========
  async function loadMeAndEmployee() {
    setMeLoading(true);
    setMeError(null);

    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) throw new Error("Not authenticated.");

      const data = (await res.json()) as MeResponse;

      setMeUser(data.user ?? null);

      const tRaw = data.user?.userType ?? null;
      const t = (tRaw || "").toString().trim().toUpperCase();
      setUserType(t || null);

      const emp = data.employee ?? null;
      if (!emp?.staffId) {
        throw new Error(
          "Employee profile not found. Please ensure this user is linked to an Employee record."
        );
      }

      const officeByPosition = isOfficePosition(emp.position);
      const allowed = t === "ADMIN" || t === "HR" || officeByPosition;

      if (!allowed) {
        const pos = emp.position || "-";
        const ut = t || "-";
        throw new Error(
          `Access denied. Time Keeping is for Office staff only. (userType=${ut}, position=${pos})`
        );
      }

      const email = (data.user?.email || "").toString().trim();
      if (!email) {
        throw new Error(
          "Missing user email in session. Please re-login so /api/auth/me returns user.email."
        );
      }

      setEmployee(emp);
    } catch (e: any) {
      setMeError(e?.message || "Failed to load current user.");
      setEmployee(null);
      setMeUser(null);
    } finally {
      setMeLoading(false);
    }
  }

  async function apiGetStatusAndWeek(staffId: string) {
    setError(null);
    setLoading(true);
    setBusy("REFRESH");

    try {
      const ctx = getCtxOrThrow();

      const qs = new URLSearchParams({
        staffId: staffId.trim(),
        from: weekStartISO,
        to: weekEndISO,
      });
      appendCtxToSearchParams(qs, ctx);

      const [sRes, rRes] = await Promise.all([
        fetch(`${API_BASE}/time-keeping/status?${qs.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }),
        fetch(`${API_BASE}/time-keeping/attendance?${qs.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }),
      ]);

      if (!sRes.ok) {
        const t = await sRes.text();
        throw new Error(
          `Failed to load status (${sRes.status}). ${t || ""}`.trim()
        );
      }
      if (!rRes.ok) {
        const t = await rRes.text();
        throw new Error(
          `Failed to load attendance (${rRes.status}). ${t || ""}`.trim()
        );
      }

      const sJson = (await sRes.json()) as TKStatus;
      const rJson = (await rRes.json()) as AttendanceRow[];

      setStatus(sJson);
      setRows(Array.isArray(rJson) ? rJson : []);
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
      setBusy(null);
    }
  }

  async function apiCheckIn(staffId: string) {
    setError(null);
    setBusy("CHECKIN");

    try {
      const ctx = getCtxOrThrow();
      const loc = await getBrowserLocation();

      const res = await fetch(`${API_BASE}/time-keeping/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          staffId: staffId.trim(),
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          source: "WEB",
          clientTime: new Date().toISOString(),
          userEmail: ctx.userEmail,
          userType: ctx.userType,
          userId: ctx.userId,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Check-in failed (${res.status}). ${t || ""}`.trim());
      }

      await apiGetStatusAndWeek(staffId);
    } catch (e: any) {
      setError(e?.message || "Check-in failed");
    } finally {
      setBusy(null);
    }
  }

  async function apiCheckOut(staffId: string) {
    setError(null);
    setBusy("CHECKOUT");

    try {
      const ctx = getCtxOrThrow();
      const loc = await getBrowserLocation();

      const res = await fetch(`${API_BASE}/time-keeping/check-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          staffId: staffId.trim(),
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          source: "WEB",
          clientTime: new Date().toISOString(),
          userEmail: ctx.userEmail,
          userType: ctx.userType,
          userId: ctx.userId,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Check-out failed (${res.status}). ${t || ""}`.trim());
      }

      await apiGetStatusAndWeek(staffId);
    } catch (e: any) {
      setError(e?.message || "Check-out failed");
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    loadMeAndEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!employee?.staffId) return;
    apiGetStatusAndWeek(employee.staffId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.staffId, weekStartISO, weekEndISO]);

  useEffect(() => {
    if (!isApprover) return;
    apiAdminListWeekly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApprover, weekStartISO, weekEndISO]);

  const canUseButtons =
    !!employee?.staffId && !!status && !meLoading && !meError;

  const weekRangeLabel = `${fmtDateMMDDFromYYYYMMDD(
    weekStartISO
  )} → ${fmtDateMMDDFromYYYYMMDD(weekEndISO)} (Sun–Sat)`;

  // ✅ Modal totals from daily
  const modalTotals = useMemo(() => {
    const daily = activeApproval?.daily || [];
    const computed = daily.reduce((s, d) => s + (d.computedMinutes || 0), 0);

    let after = 0;
    for (const d of daily) {
      const raw = dailyAdjustInputs[d.date] ?? "";
      const mins = parseAdjustInputToMinutes(raw);
      after += mins === null ? d.computedMinutes : mins;
    }

    return { computed, after };
  }, [activeApproval?.daily, dailyAdjustInputs]);

  return (
    <div className="min-h-screen bg-bac-bg text-bac-text">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Time Keeping</h1>
            <p className="text-sm text-bac-muted">
              Office staff attendance (GPS required). Payroll uses approved week
              totals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                employee?.staffId && apiGetStatusAndWeek(employee.staffId)
              }
              disabled={!employee?.staffId || busy !== null}
              className="h-10 rounded-xl border border-bac-border bg-bac-panel px-4 text-sm font-medium hover:opacity-90 disabled:opacity-60"
            >
              {busy === "REFRESH" ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {meLoading ? (
          <div className="mt-5 rounded-2xl border border-bac-border bg-bac-panel p-4 text-sm text-bac-muted">
            Loading your profile...
          </div>
        ) : meError ? (
          <div className="mt-5 rounded-2xl border border-bac-border bg-bac-panel p-4 text-sm text-bac-red">
            {meError}
          </div>
        ) : employee ? (
          <div className="mt-5 rounded-2xl border border-bac-border bg-bac-panel p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold">
                  Employee Profile (auto-filled)
                </div>
                <div className="mt-1 text-xs text-bac-muted">
                  Staff ID:{" "}
                  <span className="text-bac-text">{employee.staffId}</span>
                </div>
              </div>

              <div className="text-xs text-bac-muted">
                {employee.firstName} {employee.lastName} • {employee.position}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                <div className="text-xs text-bac-muted">Email</div>
                <div className="mt-1 text-sm">{employee.email || "-"}</div>
              </div>
              <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                <div className="text-xs text-bac-muted">Phone</div>
                <div className="mt-1 text-sm">{employee.phone || "-"}</div>
              </div>
              <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                <div className="text-xs text-bac-muted">Address</div>
                <div className="mt-1 text-sm">{employee.address || "-"}</div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Controls */}
        <div className="mt-5 grid grid-cols-1 gap-3 rounded-2xl border border-bac-border bg-bac-panel p-4 md:grid-cols-4">
          <div className="flex flex-col">
            <label className="text-xs text-bac-muted">Week Start (Sun)</label>
            <input
              type="date"
              value={weekStartISO}
              onChange={(e) => setWeekStartISO(e.target.value)}
              className="h-10 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
            />
            <div className="mt-1 text-xs text-bac-muted">
              {fmtDateMMDDFromYYYYMMDD(weekStartISO)}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-bac-muted">Week End (Sat)</label>
            <input
              type="date"
              value={weekEndISO}
              onChange={(e) => setWeekEndISO(e.target.value)}
              className="h-10 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
            />
            <div className="mt-1 text-xs text-bac-muted">
              {fmtDateMMDDFromYYYYMMDD(weekEndISO)}
            </div>
          </div>

          <div className="hidden md:block" />

          <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
            <div className="text-xs text-bac-muted">This Week Total</div>
            <div className="mt-1 text-xl font-semibold">
              {minutesToHhMm(totalMinutes)}
            </div>
            <div className="text-xs text-bac-muted">
              ({minutesToHoursDecimal(totalMinutes).toFixed(2)} hrs)
            </div>
          </div>
        </div>

        {/* 3 cards */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
            <div className="text-sm font-semibold">Today is</div>
            <div className="mt-2 text-sm text-bac-muted">{getTodayLabel()}</div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() =>
                  employee?.staffId && apiCheckIn(employee.staffId)
                }
                disabled={
                  !canUseButtons || status?.isCheckedIn || busy !== null
                }
                className="h-10 flex-1 rounded-xl bg-bac-green px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                title="GPS required"
              >
                {busy === "CHECKIN" ? "Checking in..." : "Check In"}
              </button>

              <button
                onClick={() =>
                  employee?.staffId && apiCheckOut(employee.staffId)
                }
                disabled={
                  !canUseButtons || !status?.isCheckedIn || busy !== null
                }
                className="h-10 flex-1 rounded-xl bg-bac-red px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                title="GPS required"
              >
                {busy === "CHECKOUT" ? "Checking out..." : "Check Out"}
              </button>
            </div>

            {error ? (
              <div className="mt-3 rounded-xl border border-bac-border bg-bac-bg p-3 text-sm text-bac-red">
                {error}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-bac-border bg-bac-bg p-3 text-xs text-bac-muted">
                GPS is required for every check-in/out. If week is approved, you
                must ask Admin/HR to unlock.
              </div>
            )}

            {loading ? (
              <div className="mt-3 text-sm text-bac-muted">Loading...</div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
            <div className="text-sm font-semibold">Current Status</div>
            <div className="mt-2 text-sm text-bac-muted">
              Staff:{" "}
              <span className="text-bac-text">{status?.staffName || "-"}</span>
            </div>
            <div className="mt-1 text-sm text-bac-muted">
              Checked In:{" "}
              <span className="text-bac-text">
                {status ? (status.isCheckedIn ? "YES" : "NO") : "-"}
              </span>
            </div>
            <div className="mt-1 text-sm text-bac-muted">
              Last Check-in:{" "}
              <span className="text-bac-text">
                {fmtDateTimeMMDD(status?.lastCheckInAt)}
              </span>
            </div>
            <div className="mt-1 text-sm text-bac-muted">
              Last Check-out:{" "}
              <span className="text-bac-text">
                {fmtDateTimeMMDD(status?.lastCheckOutAt)}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-bac-border bg-bac-panel p-4">
            <div className="text-sm font-semibold">GPS (Last Capture)</div>
            <div className="mt-2 text-sm text-bac-muted">
              Latitude:{" "}
              <span className="text-bac-text">{fmtNum(status?.lastLat)}</span>
            </div>
            <div className="mt-1 text-sm text-bac-muted">
              Longitude:{" "}
              <span className="text-bac-text">{fmtNum(status?.lastLng)}</span>
            </div>
            <div className="mt-1 text-sm text-bac-muted">
              Accuracy:{" "}
              <span className="text-bac-text">
                {status?.lastAccuracy ?? "-"} m
              </span>
            </div>
          </div>
        </div>

        {/* Attendance table (self view) */}
        <div className="mt-6 rounded-2xl border border-bac-border bg-bac-panel">
          <div className="flex items-center justify-between border-b border-bac-border px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Attendance Records</div>
              <div className="text-xs text-bac-muted">
                Week: {weekRangeLabel}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-bac-muted">
                <tr className="border-b border-bac-border">
                  <th className="px-4 py-3">Check In</th>
                  <th className="px-4 py-3">Check Out</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">GPS</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Flags</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-bac-muted" colSpan={6}>
                      No records.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="border-b border-bac-border">
                      <td className="px-4 py-3">
                        {fmtDateTimeMMDD(r.checkInAt)}
                      </td>
                      <td className="px-4 py-3">
                        {fmtDateTimeMMDD(r.checkOutAt)}
                      </td>
                      <td className="px-4 py-3">
                        {r.totalMinutes === null
                          ? "-"
                          : minutesToHhMm(r.totalMinutes)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-bac-muted">
                          lat {fmtNum(r.latitude)} / lng {fmtNum(r.longitude)}
                        </div>
                        <div className="text-xs text-bac-muted">
                          acc {r.accuracy ?? "-"} m
                        </div>
                      </td>
                      <td className="px-4 py-3">{r.source}</td>
                      <td className="px-4 py-3">
                        {r.flags?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {r.flags.map((f) => (
                              <span
                                key={f}
                                className="rounded-full border border-bac-border bg-bac-bg px-2 py-0.5 text-xs"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-bac-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Approval Panel */}
        {isApprover && (
          <div className="mt-6 rounded-2xl border border-bac-border bg-bac-panel">
            <div className="flex flex-col gap-3 border-b border-bac-border px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold">
                  Weekly Approval (Admin / HR)
                </div>
                <div className="text-xs text-bac-muted">
                  Adjust per day, then approve. Payroll uses approved totals.
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={approvalSearch}
                  onChange={(e) => setApprovalSearch(e.target.value)}
                  placeholder="Search staff (ID / name / position)"
                  className="h-10 w-full rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary sm:w-[280px]"
                />

                <select
                  value={approvalStatusFilter}
                  onChange={(e) =>
                    setApprovalStatusFilter(e.target.value as any)
                  }
                  className="h-10 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                >
                  <option value="ALL">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                </select>

                <button
                  onClick={() => apiAdminListWeekly()}
                  disabled={approvalLoading}
                  className="h-10 rounded-xl border border-bac-border bg-bac-bg px-4 text-sm font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {approvalLoading ? "Loading..." : "Reload"}
                </button>
              </div>
            </div>

            {approvalError ? (
              <div className="px-4 pt-4 text-sm text-bac-red">
                {approvalError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-4">
              <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                <div className="text-xs text-bac-muted">Week</div>
                <div className="mt-1 text-sm font-semibold">
                  {weekRangeLabel}
                </div>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                <div className="text-xs text-bac-muted">Pending</div>
                <div className="mt-1 text-xl font-semibold">
                  {approvalTotals.pending}
                </div>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                <div className="text-xs text-bac-muted">Approved</div>
                <div className="mt-1 text-xl font-semibold">
                  {approvalTotals.approved}
                </div>
              </div>

              <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                <div className="text-xs text-bac-muted">Final Total (All)</div>
                <div className="mt-1 text-xl font-semibold">
                  {minutesToHhMm(approvalTotals.final)}
                </div>
                <div className="text-xs text-bac-muted">
                  (Computed: {minutesToHhMm(approvalTotals.computed)})
                </div>
              </div>
            </div>

            <div className="overflow-x-auto px-4 pb-4">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-bac-muted">
                  <tr className="border-b border-bac-border">
                    <th className="py-3 pr-3">Staff ID</th>
                    <th className="py-3 pr-3">Name</th>
                    <th className="py-3 pr-3">Position</th>
                    <th className="py-3 pr-3">Computed</th>
                    <th className="py-3 pr-3">Final</th>
                    <th className="py-3 pr-3">Flags</th>
                    <th className="py-3 pr-3">Status</th>
                    <th className="py-3 pr-3">Approved by</th>
                    <th className="py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredWeeklyApprovals.length === 0 ? (
                    <tr>
                      <td className="py-6 text-bac-muted" colSpan={9}>
                        No results.
                      </td>
                    </tr>
                  ) : (
                    filteredWeeklyApprovals.map((r) => (
                      <tr
                        key={r.staffId}
                        className="border-b border-bac-border"
                      >
                        <td className="py-3 pr-3 font-medium">{r.staffId}</td>
                        <td className="py-3 pr-3">{r.name}</td>
                        <td className="py-3 pr-3 text-bac-muted">
                          {r.position}
                        </td>

                        <td className="py-3 pr-3">
                          {minutesToHhMm(r.computedMinutes)}
                        </td>

                        <td className="py-3 pr-3 font-semibold">
                          {minutesToHhMm(r.finalMinutes ?? r.computedMinutes)}
                        </td>

                        <td className="py-3 pr-3">
                          {r.flagsCount > 0 ? (
                            <span className="rounded-full border border-bac-border bg-bac-bg px-2 py-0.5 text-xs">
                              {r.flagsCount} flags
                            </span>
                          ) : (
                            <span className="text-bac-muted">-</span>
                          )}
                        </td>

                        <td className="py-3 pr-3">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs ${chipClass(
                              r.status
                            )}`}
                          >
                            {r.status}
                          </span>
                        </td>

                        {/* ✅ No repeated "Approved by" label */}
                        <td className="py-3 pr-3 text-xs text-bac-muted">
                          {r.status === "APPROVED" ? (
                            <>
                              <div className="font-medium text-bac-text">
                                {r.approvedByName || r.approvedBy || "-"}
                              </div>
                              <div>{fmtDateTimeMMDD(r.approvedAt)}</div>
                            </>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="py-3 text-right">
                          <button
                            onClick={() => openReview(r)}
                            className="h-9 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm font-medium hover:opacity-90"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {approvalLoading ? (
                <div className="mt-3 text-xs text-bac-muted">
                  Loading approvals...
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Modal */}
        {modalOpen && activeApproval && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-4xl rounded-2xl border border-bac-border bg-bac-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">Review & Approve</div>
                  <div className="mt-1 text-sm text-bac-muted">
                    {activeApproval.staffId} • {activeApproval.name} •{" "}
                    {activeApproval.position}
                  </div>
                  <div className="mt-1 text-xs text-bac-muted">
                    Week: {weekRangeLabel}
                  </div>
                </div>

                <button
                  onClick={closeReview}
                  className="h-9 rounded-xl border border-bac-border bg-bac-bg px-3 text-sm hover:opacity-90"
                >
                  Close
                </button>
              </div>

              {modalError ? (
                <div className="mt-3 rounded-xl border border-bac-border bg-bac-bg p-3 text-sm text-bac-red">
                  {modalError}
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                  <div className="text-xs text-bac-muted">Computed</div>
                  <div className="mt-1 text-xl font-semibold">
                    {minutesToHhMm(activeApproval.computedMinutes)}
                  </div>
                  <div className="text-xs text-bac-muted">(raw attendance)</div>
                </div>

                <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                  <div className="text-xs text-bac-muted">
                    Total Hours (After Adjusted)
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {minutesToHhMm(modalTotals.after)}
                  </div>
                  <div className="text-xs text-bac-muted">
                    This weekly total is used for Payroll (after approval).
                  </div>
                </div>

                <div className="rounded-2xl border border-bac-border bg-bac-bg p-3">
                  <div className="text-xs text-bac-muted">Status</div>
                  <div className="mt-1">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${chipClass(
                        activeApproval.status
                      )}`}
                    >
                      {activeApproval.status}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-bac-muted">
                    Flags: {activeApproval.flagsCount}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-xs text-bac-muted">Reason / Notes</label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="mt-1 min-h-[80px] w-full rounded-2xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                  placeholder="Explain why you adjusted hours (required for Unlock; recommended for Adjust/Approve)."
                  disabled={modalBusy !== null}
                />
              </div>

              {/* ✅ Daily Summary (Adjust per day) */}
              <div className="mt-4 rounded-2xl border border-bac-border bg-bac-bg">
                <div className="border-b border-bac-border px-4 py-3">
                  <div className="text-sm font-semibold">
                    Daily Summary (Adjust per day)
                  </div>
                  <div className="text-xs text-bac-muted">
                    Leave Adjust blank to use Computed. Use H:MM (e.g. 0:45) or
                    decimal hours (e.g. 1.25).
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-bac-muted">
                      <tr className="border-b border-bac-border">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Computed</th>
                        <th className="px-4 py-3">Adjust</th>
                        <th className="px-4 py-3">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(activeApproval.daily || []).length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-bac-muted" colSpan={4}>
                            No records.
                          </td>
                        </tr>
                      ) : (
                        (activeApproval.daily || []).map((d) => {
                          const raw = dailyAdjustInputs[d.date] ?? "";
                          const mins = parseAdjustInputToMinutes(raw);
                          const result =
                            mins === null ? d.computedMinutes : mins;

                          return (
                            <tr
                              key={d.date}
                              className="border-b border-bac-border"
                            >
                              <td className="px-4 py-3">
                                {formatISOToMMDD(d.date)}
                              </td>
                              <td className="px-4 py-3">
                                {minutesToHhMm(d.computedMinutes)}
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  value={raw}
                                  onChange={(e) =>
                                    setDailyAdjustInputs((prev) => ({
                                      ...prev,
                                      [d.date]: e.target.value,
                                    }))
                                  }
                                  placeholder="e.g. 0:45"
                                  className="h-9 w-[120px] rounded-xl border border-bac-border bg-bac-panel px-3 text-sm outline-none focus:ring-2 focus:ring-bac-primary"
                                  disabled={modalBusy !== null}
                                />
                              </td>
                              <td className="px-4 py-3 font-semibold">
                                {minutesToHhMm(result)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attendance preview */}
              <div className="mt-4 rounded-2xl border border-bac-border bg-bac-bg">
                <div className="border-b border-bac-border px-4 py-3">
                  <div className="text-sm font-semibold">
                    Raw Attendance (events)
                  </div>
                  <div className="text-xs text-bac-muted">
                    Records: {activeAttendance.length}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-bac-muted">
                      <tr className="border-b border-bac-border">
                        <th className="px-4 py-3">Check In</th>
                        <th className="px-4 py-3">Check Out</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Flags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeAttendance.length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-bac-muted" colSpan={4}>
                            {modalBusy === "LOAD"
                              ? "Loading..."
                              : "No records."}
                          </td>
                        </tr>
                      ) : (
                        activeAttendance.map((r) => (
                          <tr key={r.id} className="border-b border-bac-border">
                            <td className="px-4 py-3">
                              {fmtDateTimeMMDD(r.checkInAt)}
                            </td>
                            <td className="px-4 py-3">
                              {fmtDateTimeMMDD(r.checkOutAt)}
                            </td>
                            <td className="px-4 py-3">
                              {r.totalMinutes === null
                                ? "-"
                                : minutesToHhMm(r.totalMinutes)}
                            </td>
                            <td className="px-4 py-3">
                              {r.flags?.length ? (
                                <div className="flex flex-wrap gap-2">
                                  {r.flags.map((f) => (
                                    <span
                                      key={f}
                                      className="rounded-full border border-bac-border bg-bac-panel px-2 py-0.5 text-xs"
                                    >
                                      {f}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-bac-muted">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={apiAdminSaveAdjustment}
                  disabled={modalBusy !== null}
                  className="h-10 rounded-xl border border-bac-border bg-bac-bg px-4 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {modalBusy === "SAVE_ADJUST"
                    ? "Saving..."
                    : "Save Adjustment"}
                </button>

                <button
                  onClick={apiAdminUnlock}
                  disabled={modalBusy !== null}
                  className="h-10 rounded-xl border border-bac-border bg-bac-panel px-4 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {modalBusy === "UNLOCK" ? "Unlocking..." : "Unlock"}
                </button>

                <button
                  onClick={apiAdminApprove}
                  disabled={modalBusy !== null}
                  className="h-10 rounded-xl bg-bac-green px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {modalBusy === "APPROVE" ? "Approving..." : "Approve Week"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
