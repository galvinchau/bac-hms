// web/app/(dashboard)/poc/daily-logs/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

type Status = "DRAFT" | "SUBMITTED";
type TaskStatus = "INDEPENDENT" | "VERBAL_PROMPT" | "PHYSICAL_ASSIST" | "REFUSED";

type TaskEditHistory = {
  at: string; // ISO
  byId?: string | null;
  byName?: string | null;
  reason?: string | null;
  action: "LOCK" | "EDIT_ENABLE" | "EDIT_SAVE";
};

type TaskDetail = {
  id: string;
  pocDutyId: string;
  taskNo?: number | null;
  duty: string;
  category?: string | null;
  status: TaskStatus | null;
  note?: string | null;
  timestamp?: string | null;

  lockedAt?: string | null;
  lockedById?: string | null;
  lockedByName?: string | null;

  lastEditedAt?: string | null;
  lastEditedById?: string | null;
  lastEditedByName?: string | null;
  lastEditReason?: string | null;

  editHistory?: TaskEditHistory[] | null;
};

type DailyLogDetail = {
  id: string;
  pocId: string;
  pocNumber?: string | null;
  individualId: string;

  dspId: string | null;
  dspLockedAt?: string | null;
  date: string;
  status: Status;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;

  auditReason?: string | null;
  auditUpdatedAt?: string | null;
  auditActorName?: string | null;

  tasks: TaskDetail[];
};

type DutyItem = {
  id: string;
  pocId: string;
  category?: string | null;
  taskNo?: number | null;
  duty: string;
  instruction?: string | null;
  daysOfWeek?: any;
  sortOrder?: number | null;
};

type AuthMe = {
  ok: boolean;
  user?: any;
};

function qs(obj: Record<string, string | number | null | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (!s) continue;
    sp.set(k, s);
  }
  return sp.toString();
}

async function readJsonOrThrow(res: Response) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) {
    const txt = await res.text().catch(() => "");
    throw new Error(`API returned non-JSON (${res.status}). ${txt.slice(0, 120)}`);
  }
  return res.json();
}

const TZ_PA = "America/New_York";

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

function toYmdAny(input: string) {
  const s = String(input || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function dateFromYmdNoShift(ymd: string) {
  if (!isYmd(ymd)) return null;
  const d = new Date(`${ymd}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function fmtDateOnlyPA_MMDDYYYY(dateAny: string) {
  const ymd = toYmdAny(dateAny);
  const d = dateFromYmdNoShift(ymd);
  if (!d) return dateAny;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ_PA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function fmtDateHeaderPA(dateAny: string) {
  const ymd = toYmdAny(dateAny);
  const d = dateFromYmdNoShift(ymd);
  if (!d) return dateAny;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ_PA,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

function fmtLocalPA(dtIso: string) {
  const s = String(dtIso || "").trim();
  if (!s) return s;

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return dtIso;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ_PA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function nowIso() {
  return new Date().toISOString();
}

/* ===================== Days-of-week filtering ===================== */

function hasAnyTrue(obj: any) {
  if (!obj || typeof obj !== "object") return false;
  return Object.values(obj).some((v) => v === true);
}

function getDowKeyFromYmd(ymd: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const dt = new Date(`${ymd}T12:00:00.000Z`);
  const wk = new Intl.DateTimeFormat("en-US", { timeZone: TZ_PA, weekday: "short" }).format(dt);

  const map: Record<string, string> = {
    Sun: "sun",
    Mon: "mon",
    Tue: "tue",
    Wed: "wed",
    Thu: "thu",
    Fri: "fri",
    Sat: "sat",
  };

  return map[wk] ?? null;
}

function dutyAppliesToDay(daysOfWeek: any, ymd: string): boolean {
  if (!daysOfWeek) return true;

  const key = getDowKeyFromYmd(ymd);
  if (!key) return true;

  let v: any = daysOfWeek;
  if (typeof v === "string") {
    const raw = v.trim();
    if (!raw) return true;
    try {
      v = JSON.parse(raw);
    } catch {
      return true;
    }
  }

  if (v && typeof v === "object" && !Array.isArray(v)) {
    if (!hasAnyTrue(v)) return false;
    return v[key] === true;
  }
  return true;
}

function getTaskDutyId(t: TaskDetail, dutyById: Record<string, DutyItem>): string {
  const a = String((t as any)?.pocDutyId || "").trim();
  const b = String((t as any)?.id || "").trim();

  if (a && dutyById[a]) return a;
  if (b && dutyById[b]) return b;

  return a || b;
}

/* ===================== Auth actor ===================== */

function deriveActorFromMe(me: any): { actorId: string; actorName: string } {
  const u = me?.user || me;

  const actorId = String(u?.employeeId || u?.dspId || u?.employee?.id || u?.id || u?.userId || u?.uid || "").trim();

  const actorName = String(
    u?.name ||
      u?.fullName ||
      u?.displayName ||
      u?.profile?.name ||
      u?.employee?.name ||
      u?.employee?.fullName ||
      u?.username ||
      u?.userName ||
      u?.email ||
      ""
  ).trim();

  return { actorId, actorName };
}

function tryReadSignedInNameFromHeader(): string {
  try {
    const nodes = Array.from(document.querySelectorAll("*")) as HTMLElement[];
    for (const el of nodes) {
      const txt = String(el.textContent || "").trim();
      if (txt === "Signed in as") {
        const next = el.nextElementSibling as HTMLElement | null;
        const name = String(next?.textContent || "").trim();
        if (name) return name;
      }
    }
    const bodyText = String(document.body?.innerText || "");
    const idx = bodyText.indexOf("Signed in as");
    if (idx >= 0) {
      const after = bodyText
        .slice(idx)
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      if (after.length >= 2 && after[0] === "Signed in as" && after[1]) return after[1];
    }
  } catch {}
  return "";
}

/* ===================== Lock / History helpers ===================== */

function taskIsLocked(t: TaskDetail) {
  if (String((t as any)?.lockedAt || "").trim()) return true;
  if (String(t.timestamp || "").trim()) return true;
  return false;
}

function normalizeHistory(arr: any): TaskEditHistory[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => ({
      at: String(x?.at || x?.timestamp || x?.time || ""),
      byId: x?.byId ?? x?.actorId ?? null,
      byName: x?.byName ?? x?.actorName ?? null,
      reason: x?.reason ?? null,
      action: (x?.action as any) || "EDIT_SAVE",
    }))
    .filter((x) => !!x.at);
}

function hasAnyEditAction(hist: TaskEditHistory[]) {
  return hist.some((h) => h.action === "EDIT_ENABLE" || h.action === "EDIT_SAVE");
}

function actionLabel(a: TaskEditHistory["action"]) {
  if (a === "LOCK") return "LOCK";
  if (a === "EDIT_ENABLE") return "EDIT ENABLED";
  return "EDIT SAVED";
}

export default function DailyLogDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "").trim();

  const returnToRaw = searchParams.get("returnTo") || "";
  const returnTo = String(returnToRaw || "").trim();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [item, setItem] = useState<DailyLogDetail | null>(null);
  const [saving, setSaving] = useState(false);

  const [dutyById, setDutyById] = useState<Record<string, DutyItem>>({});
  const [dutiesLoaded, setDutiesLoaded] = useState(false);

  const [actorId, setActorId] = useState<string>("");
  const [actorName, setActorName] = useState<string>("");

  const [dspNames, setDspNames] = useState<Record<string, string>>({});

  const [dspLocked, setDspLocked] = useState(false);

  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const [pendingNextStatus, setPendingNextStatus] = useState<Status | undefined>(undefined);

  const [taskEditOpen, setTaskEditOpen] = useState(false);
  const [taskEditReason, setTaskEditReason] = useState("");
  const [taskEditId, setTaskEditId] = useState<string>("");
  const [taskEditLabel, setTaskEditLabel] = useState<string>("");

  const editableTaskIdsRef = useRef<Set<string>>(new Set());
  const editReasonByTaskRef = useRef<Record<string, string>>({});

  function isTaskTemporarilyEditable(taskId: string) {
    return editableTaskIdsRef.current.has(taskId);
  }

  function markTaskEditable(taskId: string, reason: string) {
    editableTaskIdsRef.current.add(taskId);
    editReasonByTaskRef.current[taskId] = reason;
  }

  function clearTaskEditSession() {
    editableTaskIdsRef.current = new Set();
    editReasonByTaskRef.current = {};
  }

  function clearTaskEditable(taskId: string) {
    const set = editableTaskIdsRef.current;
    set.delete(taskId);
    editableTaskIdsRef.current = set;

    const map = editReasonByTaskRef.current;
    delete map[taskId];
    editReasonByTaskRef.current = map;
  }

  async function loadDspNamesByIds(ids: string[]) {
    const unique = Array.from(new Set(ids.map((x) => String(x || "").trim()).filter(Boolean)));
    if (!unique.length) return;

    const missing = unique.filter((id) => !dspNames[id]);
    if (!missing.length) return;

    try {
      const res = await fetch(`/api/poc/dsp-names?${qs({ ids: missing.join(",") })}`, { method: "GET" });
      const json = (await readJsonOrThrow(res)) as { ok: boolean; map?: Record<string, string> };
      if (!res.ok || !json?.ok) return;

      const m = json.map || {};
      setDspNames((prev) => ({ ...(prev || {}), ...m }));
    } catch {}
  }

  function bestNameFromId(id: string) {
    const k = String(id || "").trim();
    if (!k) return "";
    return String(dspNames[k] || "").trim();
  }

  function bestActorDisplayNameStrict(): string {
    const nm = String(actorName || "").trim();
    if (nm) return nm;

    const id0 = String(actorId || "").trim();
    if (id0) {
      const nm2 = bestNameFromId(id0);
      if (nm2) return nm2;
    }

    const headerName = tryReadSignedInNameFromHeader();
    if (headerName) return headerName;

    return "Signed-in User";
  }

  // ✅ FIX CORE: if task lock meta missing after reload, fallback to DailyLog DSP
  function getLockMeta(t: TaskDetail, fallbackDspId?: string | null) {
    const lockName = String((t as any)?.lockedByName || "").trim();
    const lockId = String((t as any)?.lockedById || "").trim();
    const lockAt = String((t as any)?.lockedAt || "").trim() || (String(t.timestamp || "").trim() ? String(t.timestamp) : "");

    // If server doesn't return lockedByName/Id, use daily log dspId as fallback
    const fbId = String(fallbackDspId || "").trim();
    const fbName = fbId ? (bestNameFromId(fbId) || fbId) : "";

    const resolvedName = lockName || (lockId ? bestNameFromId(lockId) : "") || (lockId ? lockId : "") || fbName;
    const resolvedId = lockId || fbId;

    return { name: resolvedName || "", at: lockAt || "", id: resolvedId || "" };
  }

  function getEditMeta(t: TaskDetail) {
    const editName = String((t as any)?.lastEditedByName || "").trim();
    const editId = String((t as any)?.lastEditedById || "").trim();
    const editAt = String((t as any)?.lastEditedAt || "").trim();
    const reason = String((t as any)?.lastEditReason || "").trim();

    const resolvedName = editName || (editId ? bestNameFromId(editId) : "") || (editId ? editId : "");
    return { name: resolvedName || "", at: editAt || "", reason, id: editId || "" };
  }

  async function loadMe() {
    try {
      const res = await fetch(`/api/auth/me`, { method: "GET" });
      const json = (await readJsonOrThrow(res)) as AuthMe;
      if (!res.ok || !json?.ok) return;

      const a = deriveActorFromMe(json);
      if (a.actorId) setActorId(a.actorId);
      if (a.actorName) setActorName(a.actorName);

      if (!a.actorName) {
        if (a.actorId) await loadDspNamesByIds([a.actorId]);
        const nm2 = a.actorId ? bestNameFromId(a.actorId) : "";
        if (nm2) setActorName(nm2);
        else {
          const headerName = tryReadSignedInNameFromHeader();
          if (headerName) setActorName(headerName);
        }
      }
    } catch {}
  }

  async function loadDutiesForPoc(pocId: string) {
    const pid = String(pocId || "").trim();
    if (!pid) {
      setDutyById({});
      setDutiesLoaded(true);
      return;
    }

    setDutiesLoaded(false);
    try {
      const res = await fetch(`/api/poc/duties?${qs({ pocId: pid })}`, { method: "GET" });
      const json = (await readJsonOrThrow(res)) as { ok: boolean; items: DutyItem[]; error?: string; detail?: string };
      if (!res.ok || !json.ok) throw new Error(json.detail || json.error || `HTTP ${res.status}`);

      const map: Record<string, DutyItem> = {};
      (json.items || []).forEach((d) => {
        const did = String(d?.id || "").trim();
        if (did) map[did] = d;
      });

      setDutyById(map);
      setDutiesLoaded(true);
    } catch {
      setDutyById({});
      setDutiesLoaded(true);
    }
  }

  function computeDspLocked(nextItem: DailyLogDetail) {
    const hasAnyTimestamp = (nextItem.tasks || []).some((t) => !!String(t?.timestamp || "").trim());
    if (String(nextItem.dspLockedAt || "").trim()) return true;
    if (hasAnyTimestamp) return true;
    return false;
  }

  async function load() {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/poc/daily-logs/${encodeURIComponent(id)}`, { method: "GET" });
      const json = (await readJsonOrThrow(res)) as { ok: boolean; item?: DailyLogDetail; error?: string; detail?: string };
      if (!res.ok || !json.ok || !json.item) throw new Error(json.detail || json.error || `HTTP ${res.status}`);

      setItem(json.item);
      setDspLocked(computeDspLocked(json.item));

      await loadDutiesForPoc(json.item.pocId);

      const ids: string[] = [];
      (json.item.tasks || []).forEach((t) => {
        if (t.lockedById) ids.push(String(t.lockedById));
        if (t.lastEditedById) ids.push(String(t.lastEditedById));
      });
      if (json.item.dspId) ids.push(String(json.item.dspId));
      if (actorId) ids.push(String(actorId));
      await loadDspNamesByIds(ids);

      clearTaskEditSession();
    } catch (e: any) {
      setErr(String(e?.message || e));
      setItem(null);
      setDutyById({});
      setDutiesLoaded(false);
      setDspLocked(false);
      clearTaskEditSession();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!String(actorName || "").trim()) {
        const headerName = tryReadSignedInNameFromHeader();
        if (headerName) setActorName(headerName);
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [actorName]);

  function updateTask(taskId: string, patch: Partial<TaskDetail>) {
    setItem((prev) => {
      if (!prev) return prev;
      return { ...prev, tasks: (prev.tasks || []).map((t) => (t.id === taskId ? { ...t, ...patch } : t)) };
    });
  }

  function appendTaskHistory(taskId: string, h: TaskEditHistory) {
    setItem((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: (prev.tasks || []).map((t) => {
          if (t.id !== taskId) return t;
          const cur = normalizeHistory((t as any).editHistory);
          return { ...t, editHistory: [...cur, h] };
        }),
      };
    });
  }

  async function handleNow(tid: string) {
    if (!item) return;
    const cur = (item.tasks || []).find((x) => x.id === tid);
    if (!cur) return;
    if (taskIsLocked(cur)) return;

    const iso = nowIso();
    const resolvedName = bestActorDisplayNameStrict();

    updateTask(tid, {
      timestamp: iso,
      lockedAt: iso,
      lockedById: actorId || null,
      lockedByName: resolvedName,
    });

    appendTaskHistory(tid, {
      at: iso,
      byId: actorId || null,
      byName: resolvedName,
      reason: null,
      action: "LOCK",
    });

    setDspLocked(true);

    // ✅ keep dailyLog dspId set (so reload can fallback)
    setItem((prev) => {
      if (!prev) return prev;
      const curDsp = String(prev.dspId || "").trim();
      if (curDsp) return prev;
      if (!actorId) return prev;
      return { ...prev, dspId: actorId };
    });
  }

  function openEditTask(t: TaskDetail) {
    const taskId = String(t.id || "").trim();
    if (!taskId) return;

    setTaskEditId(taskId);
    setTaskEditLabel(`#${t.taskNo ?? ""} ${t.duty}`.trim());
    setTaskEditReason("");
    setTaskEditOpen(true);
  }

  async function enableEditTask(taskId: string, reason: string) {
    const iso = nowIso();
    const resolvedName = bestActorDisplayNameStrict();

    markTaskEditable(taskId, reason);

    appendTaskHistory(taskId, {
      at: iso,
      byId: actorId || null,
      byName: resolvedName,
      reason,
      action: "EDIT_ENABLE",
    });
  }

  async function onTaskEditContinue() {
    const r = String(taskEditReason || "").trim();
    const tid = String(taskEditId || "").trim();
    if (!tid || !r) return;

    await enableEditTask(tid, r);

    setTaskEditOpen(false);
    setTaskEditId("");
    setTaskEditLabel("");
    setTaskEditReason("");
  }

  const visibleTasks = useMemo(() => {
    const tasks = item?.tasks || [];
    if (!item) return tasks;

    if (!dutiesLoaded) return tasks;

    const hasDutyMap = dutyById && Object.keys(dutyById).length > 0;
    if (!hasDutyMap) return tasks;

    const logYmd = toYmdAny(item.date);
    if (!logYmd) return tasks;

    const belongsToPoc = tasks.filter((t) => {
      const did = getTaskDutyId(t, dutyById);
      return !!did && !!dutyById[did];
    });

    const byDay = belongsToPoc.filter((t) => {
      const did = getTaskDutyId(t, dutyById);
      const duty = dutyById[did];
      if (!duty) return false;
      return dutyAppliesToDay(duty.daysOfWeek, logYmd);
    });

    return byDay;
  }, [item, dutiesLoaded, dutyById]);

  function isOtherEditorNeedsReason(curItem: DailyLogDetail) {
    const dsp = String(curItem?.dspId || "").trim();
    if (!dspLocked) return false;
    if (!actorId) return false;
    if (!dsp) return false;
    return actorId !== dsp;
  }

  function isTaskEditable(t: TaskDetail) {
    if (!taskIsLocked(t)) return true;
    return isTaskTemporarilyEditable(String(t.id || ""));
  }

  function mergeServerItemKeepingLocalMeta(serverItem: DailyLogDetail, localBefore?: DailyLogDetail | null): DailyLogDetail {
    if (!localBefore) return serverItem;

    const localById = new Map<string, TaskDetail>();
    (localBefore.tasks || []).forEach((t) => localById.set(String(t.id), t));

    const mergedTasks = (serverItem.tasks || []).map((sv) => {
      const lv = localById.get(String(sv.id));
      if (!lv) return sv;

      const out: TaskDetail = { ...sv };

      out.lockedAt = String(out.lockedAt || "").trim() ? out.lockedAt : (lv as any).lockedAt ?? null;
      out.lockedById = String(out.lockedById || "").trim() ? out.lockedById : (lv as any).lockedById ?? null;
      out.lockedByName = String(out.lockedByName || "").trim() ? out.lockedByName : (lv as any).lockedByName ?? null;

      out.lastEditedAt = String(out.lastEditedAt || "").trim() ? out.lastEditedAt : (lv as any).lastEditedAt ?? null;
      out.lastEditedById = String(out.lastEditedById || "").trim() ? out.lastEditedById : (lv as any).lastEditedById ?? null;
      out.lastEditedByName = String(out.lastEditedByName || "").trim() ? out.lastEditedByName : (lv as any).lastEditedByName ?? null;
      out.lastEditReason = String(out.lastEditReason || "").trim() ? out.lastEditReason : (lv as any).lastEditReason ?? null;

      const svHist = normalizeHistory((out as any).editHistory);
      const lvHist = normalizeHistory((lv as any).editHistory);
      const combined = [...lvHist, ...svHist];
      const seen = new Set<string>();
      const uniq = combined.filter((h) => {
        const k = `${h.action}|${h.at}|${h.byId || ""}|${h.byName || ""}|${h.reason || ""}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      out.editHistory = uniq.length ? uniq : null;

      return out;
    });

    return { ...serverItem, tasks: mergedTasks };
  }

  async function doSave(nextStatus?: Status, auditReason?: string, opts?: { stay?: boolean }) {
    if (!item) return;

    setSaving(true);
    setErr(null);

    const localBefore = item;

    try {
      const editedMetaByTask = editReasonByTaskRef.current || {};
      const actorDisplay = bestActorDisplayNameStrict();

      // ✅ MIN FIX: always send dspId = existing dspId OR signed-in actorId (Employee.id UUID)
      const dspIdToSend = String(item.dspId || "").trim() || String(actorId || "").trim() || null;

      const payload: any = {
        status: nextStatus || item.status,

        // ✅ THIS is the critical fix (was: item.dspId ?? null)
        dspId: dspIdToSend,

        auditReason: auditReason ?? null,
        auditActorId: actorId || null,
        auditActorName: actorDisplay,

        tasks: (visibleTasks || []).map((t) => {
          const taskId = String(t.id || "").trim();
          const reason = String(editedMetaByTask[taskId] || "").trim();
          const history = normalizeHistory((t as any).editHistory);

          const saveStampIso = nowIso();

          const lockAt = (t as any).lockedAt ?? (t.timestamp ? t.timestamp : null);

          const inferredLockById =
            String((t as any).lockedById || "").trim() ||
            (String(item.dspId || "").trim() ? String(item.dspId) : "") ||
            (String(actorId || "").trim() ? String(actorId) : "");

          const inferredLockByName =
            String((t as any).lockedByName || "").trim() ||
            (inferredLockById ? (bestNameFromId(inferredLockById) || actorDisplay) : actorDisplay);

          const editedMeta =
            reason && taskIsLocked(t)
              ? {
                  lastEditedAt: saveStampIso,
                  lastEditedById: actorId || null,
                  lastEditedByName: actorDisplay,
                  lastEditReason: reason,
                }
              : {
                  lastEditedAt: (t as any).lastEditedAt ?? null,
                  lastEditedById: (t as any).lastEditedById ?? null,
                  lastEditedByName: (t as any).lastEditedByName ?? null,
                  lastEditReason: (t as any).lastEditReason ?? null,
                };

          const nextHist =
            reason && taskIsLocked(t)
              ? [
                  ...history,
                  {
                    at: saveStampIso,
                    byId: actorId || null,
                    byName: actorDisplay,
                    reason,
                    action: "EDIT_SAVE" as const,
                  },
                ]
              : history;

          return {
            pocDutyId: String((t as any)?.pocDutyId || (t as any)?.id || "").trim(),
            status: t.status,
            note: t.note ?? null,
            timestamp: t.timestamp ?? null,

            lockedAt: lockAt,
            lockedById: inferredLockById || null,
            lockedByName: inferredLockByName || null,

            ...editedMeta,
            editHistory: nextHist.length ? nextHist : null,
          };
        }),
      };

      const res = await fetch(`/api/poc/daily-logs/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await readJsonOrThrow(res)) as { ok: boolean; item?: DailyLogDetail; error?: string; detail?: string };
      if (!res.ok || !json.ok || !json.item) throw new Error(json.detail || json.error || `HTTP ${res.status}`);

      const merged = mergeServerItemKeepingLocalMeta(json.item, localBefore);

      setItem(merged);
      setDspLocked(computeDspLocked(merged));

      const ids: string[] = [];
      (merged.tasks || []).forEach((t) => {
        if (t.lockedById) ids.push(String(t.lockedById));
        if (t.lastEditedById) ids.push(String(t.lastEditedById));
      });
      if (merged.dspId) ids.push(String(merged.dspId));
      if (actorId) ids.push(String(actorId));
      await loadDspNamesByIds(ids);

      clearTaskEditSession();

      if (!opts?.stay) {
        router.back();
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function save(nextStatus?: Status) {
    if (!item) return;

    if (isOtherEditorNeedsReason(item)) {
      setPendingNextStatus(nextStatus);
      setReasonText("");
      setReasonOpen(true);
      return;
    }

    await doSave(nextStatus);
  }

  async function saveTaskOnly(taskId: string) {
    if (!item) return;
    await doSave(item.status, undefined, { stay: true });
    clearTaskEditable(taskId);
  }

  function onBack() {
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    router.back();
  }

  const pageWrap = "min-h-[calc(100vh-64px)] bg-[#071427] text-white";
  const card = "rounded-lg border border-white/10 bg-[#071427]";
  const cardInner = "p-4";
  const softText = "text-white/70";
  const mono = "font-mono";
  const btn = "px-3 py-2 rounded-md border border-white/20 hover:bg-white/10 disabled:opacity-50";
  const btnPrimary = "px-4 py-2 rounded-md bg-white text-black hover:opacity-90 disabled:opacity-50";

  if (loading || !item) {
    return (
      <div className={`${pageWrap} p-4`}>
        <div className={`${card} ${cardInner}`}>
          <div className="text-lg font-semibold text-white">Daily Log Detail</div>
          <div className={`mt-2 text-sm ${softText}`}>{loading ? "Loading..." : err ? `Error: ${err}` : "Not found."}</div>
          <div className="mt-3">
            <button className={btn} onClick={onBack}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayDate = fmtDateOnlyPA_MMDDYYYY(item.date);
  const displayHeaderDate = fmtDateHeaderPA(item.date);
  const printTitle = `Daily Log — ${displayHeaderDate}`;
  const pocDisplay = item.pocNumber?.trim() ? item.pocNumber : item.pocId;

  const showAuditBox =
    String(item.auditReason || "").trim() ||
    String(item.auditUpdatedAt || "").trim() ||
    String(item.auditActorName || "").trim();

  return (
    <div className={`${pageWrap} p-2 md:p-4`}>
      <style>{`
        .full-bleed{
          width: 100vw;
          position: relative;
          left: 50%;
          right: 50%;
          margin-left: -50vw;
          margin-right: -50vw;
          padding-left: 16px;
          padding-right: 16px;
        }

        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-card { box-shadow: none !important; border: 1px solid #000 !important; background: white !important; }
          .print-table th, .print-table td { border: 1px solid #000 !important; color: black !important; }

          .full-bleed{
            width: auto !important;
            position: static !important;
            left: auto !important;
            right: auto !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
        }
      `}</style>

      {/* Task Edit Reason modal */}
      {taskEditOpen ? (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0B1220] p-4 shadow-xl">
            <div className="text-lg font-semibold text-white">Edit Locked Task</div>
            <div className="mt-2 text-sm text-white/70">
              This task is locked (after <b>Now</b>). To edit Status/Note, please enter a reason.
            </div>
            <div className="mt-2 text-xs text-white/60">
              Task: <span className="font-mono">{taskEditLabel || taskEditId}</span>
            </div>

            <div className="mt-3">
              <textarea
                className="w-full min-h-[110px] rounded-lg border border-white/10 bg-white/10 p-3 text-white outline-none"
                value={taskEditReason}
                onChange={(e) => setTaskEditReason(e.target.value)}
                placeholder="Enter edit reason (required)..."
              />
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                className={btn}
                onClick={() => {
                  setTaskEditOpen(false);
                  setTaskEditId("");
                  setTaskEditLabel("");
                  setTaskEditReason("");
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button className={btnPrimary} onClick={onTaskEditContinue} disabled={saving || !String(taskEditReason || "").trim()}>
                Enable Edit
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Daily-level Reason modal */}
      {reasonOpen ? (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0B1220] p-4 shadow-xl">
            <div className="text-lg font-semibold text-white">Reason Required</div>
            <div className="mt-2 text-sm text-white/70">
              This Daily Log has a locked DSP. You are updating as a different user, so please enter a reason.
            </div>

            <div className="mt-3">
              <textarea
                className="w-full min-h-[110px] rounded-lg border border-white/10 bg-white/10 p-3 text-white outline-none"
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="Enter reason (required)..."
              />
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                className={btn}
                onClick={() => {
                  setReasonOpen(false);
                  setPendingNextStatus(undefined);
                  setReasonText("");
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className={btnPrimary}
                onClick={async () => {
                  const r = String(reasonText || "").trim();
                  if (!r) return;
                  setReasonOpen(false);
                  const ns = pendingNextStatus;
                  setPendingNextStatus(undefined);
                  await doSave(ns, r);
                }}
                disabled={saving || !String(reasonText || "").trim()}
              >
                Continue Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="no-print flex items-center justify-between mb-3">
        <div>
          <div className="text-xl font-semibold text-white">{printTitle}</div>
          <div className={`text-sm ${softText} ${mono}`}>Log ID: {item.id}</div>
        </div>
        <div className="flex items-center gap-2">
          <button className={btn} onClick={onBack} disabled={saving}>
            Back
          </button>
          <button className={btn} onClick={() => window.print()} disabled={saving}>
            Print
          </button>
        </div>
      </div>

      {err ? (
        <div className="no-print mb-3 text-sm text-red-300">
          Error: <span className="font-mono">{err}</span>
        </div>
      ) : null}

      <div className="full-bleed">
        <div className={`print-card ${card} ${cardInner} w-full max-w-none`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <div className={`text-xs text-[#f5c84c]`}>Date</div>
              <div className={`mt-1 ${mono} text-base text-white`}>{displayDate}</div>
            </div>

            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <div className={`text-xs text-[#f5c84c]`}>POC Number</div>
              <div className={`mt-1 ${mono} text-base text-white`}>{pocDisplay}</div>
            </div>

            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <div className={`text-xs text-[#f5c84c]`}>Status</div>
              <div className="mt-1 font-semibold text-base text-white">{item.status}</div>
              {item.submittedAt ? <div className={`text-[11px] ${softText} mt-1`}>Submitted: {fmtLocalPA(item.submittedAt)}</div> : null}
            </div>
          </div>

          {showAuditBox ? (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-xs font-semibold text-[#f5c84c]">Audit</div>
              <div className="mt-1 text-sm text-white/80">
                {item.auditReason ? (
                  <div>
                    <span className="text-white/60">Reason:</span> {item.auditReason}
                  </div>
                ) : null}
                {item.auditActorName ? (
                  <div className="mt-1">
                    <span className="text-white/60">Updated By:</span> {item.auditActorName}
                  </div>
                ) : null}
                {item.auditUpdatedAt ? (
                  <div className="mt-1">
                    <span className="text-white/60">Updated At:</span> {fmtLocalPA(item.auditUpdatedAt)}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm font-semibold text-white">
              Tasks{" "}
              <span className="text-xs text-white/50">
                ({(visibleTasks || []).length}/{(item.tasks || []).length})
              </span>
            </div>
            <div className={`no-print text-xs ${softText}`}>Timezone: {TZ_PA}. If Timestamp is empty, server stamps now().</div>
          </div>

          <div className="mt-2 overflow-auto">
            <table className="print-table w-full table-auto text-sm border border-white/10">
              <thead className="bg-white/5">
                <tr className="text-left">
                  <th className="px-3 py-2 border border-white/10 whitespace-nowrap text-[#f5c84c] font-bold">Task #</th>
                  <th className="px-3 py-2 border border-white/10 text-[#f5c84c] font-bold">Duty</th>
                  <th className="px-3 py-2 border border-white/10 whitespace-nowrap text-[#f5c84c] font-bold">Status</th>
                  <th className="px-3 py-2 border border-white/10 whitespace-nowrap text-[#f5c84c] font-bold">Timestamp (PA)</th>
                  <th className="px-3 py-2 border border-white/10 text-[#f5c84c] font-bold">DSP</th>
                  <th className="px-3 py-2 border border-white/10 text-[#f5c84c] font-bold">Note</th>
                  <th className="no-print px-3 py-2 border border-white/10 whitespace-nowrap text-[#f5c84c] font-bold">Quick</th>
                </tr>
              </thead>

              <tbody className="text-white">
                {(visibleTasks || []).map((t) => {
                  const locked = taskIsLocked(t);
                  const canEdit = isTaskEditable(t);
                  const hist = normalizeHistory((t as any).editHistory);
                  const editEnabled = isTaskTemporarilyEditable(String(t.id || ""));

                  const lock = getLockMeta(t, item.dspId);
                  const edit = getEditMeta(t);

                  const lockWho = String(lock.name || "").trim() || String(lock.id || "").trim();
                  const lockLine = locked ? `Locked${lockWho ? ` by ${lockWho}` : ""}${lock.at ? ` @ ${fmtLocalPA(lock.at)}` : ""}` : "";

                  const editLine = edit.name
                    ? `Edited by ${edit.name}${edit.at ? ` @ ${fmtLocalPA(edit.at)}` : ""}${edit.reason ? ` • ${edit.reason}` : ""}`
                    : "";

                  const showMiniHistory = editEnabled || hasAnyEditAction(hist);
                  const mini = showMiniHistory ? hist.slice().reverse().slice(0, 6) : [];

                  return (
                    <tr key={t.id} className="hover:bg-white/5 align-top">
                      <td className={`px-3 py-2 border border-white/10 ${mono} whitespace-nowrap`}>{t.taskNo ?? ""}</td>

                      <td className="px-3 py-2 border border-white/10">
                        <div className="flex flex-col">
                          <div className="break-words">{t.duty}</div>
                        </div>
                      </td>

                      <td className="px-3 py-2 border border-white/10">
                        <select
                          className="min-w-[140px] w-full border border-white/10 rounded-md px-2 py-2 bg-white/10 text-white no-print disabled:opacity-60"
                          value={t.status ?? ""}
                          onChange={(e) => updateTask(t.id, { status: (e.target.value as TaskStatus) || null })}
                          disabled={saving || !canEdit}
                          title={locked && !canEdit ? "Locked. Click Edit (reason required) to modify." : ""}
                        >
                          <option value="" className="bg-[#071427]">
                            (Select)
                          </option>
                          <option value="INDEPENDENT" className="bg-[#071427]">
                            Independent
                          </option>
                          <option value="VERBAL_PROMPT" className="bg-[#071427]">
                            Verbal Prompt
                          </option>
                          <option value="PHYSICAL_ASSIST" className="bg-[#071427]">
                            Physical Assist
                          </option>
                          <option value="REFUSED" className="bg-[#071427]">
                            Refused
                          </option>
                        </select>

                        <div className="hidden print:block">{t.status || ""}</div>
                      </td>

                      <td className="px-3 py-2 border border-white/10">
                        <div className="no-print">
                          <input
                            className="min-w-[180px] w-full border border-white/10 rounded-md px-2 py-2 bg-white/10 text-white whitespace-nowrap"
                            value={t.timestamp ? fmtLocalPA(t.timestamp) : "(auto)"}
                            readOnly
                          />
                        </div>
                        <div className="hidden print:block">{t.timestamp ? fmtLocalPA(t.timestamp) : ""}</div>
                      </td>

                      <td className="px-3 py-2 border border-white/10">
                        <div className="text-[12px] text-[#f5c84c]">
                          {lockLine ? (
                            <div className="truncate" title={lockLine}>
                              {lockLine}
                            </div>
                          ) : (
                            <div className="opacity-70">—</div>
                          )}

                          {editLine ? (
                            <div className="mt-1 opacity-90 truncate" title={editLine}>
                              {editLine}
                            </div>
                          ) : null}
                        </div>

                        {showMiniHistory ? (
                          <div className="mt-2 rounded-md border border-white/10 bg-white/5 p-2">
                            <div className="text-[11px] font-semibold text-[#f5c84c] mb-1">Edit History</div>
                            <div className="space-y-1">
                              {mini.map((h, idx) => {
                                const who = String(h.byName || h.byId || "Signed-in User");
                                const when = fmtLocalPA(h.at);
                                return (
                                  <div key={idx} className="text-[11px] text-[#f5c84c] flex flex-wrap gap-x-2 gap-y-0.5">
                                    <span className="font-mono opacity-90">{when}</span>
                                    <span className="opacity-100">{actionLabel(h.action)}</span>
                                    <span className="opacity-80">by</span>
                                    <span className="opacity-100">{who}</span>
                                    {h.reason ? (
                                      <>
                                        <span className="opacity-70">•</span>
                                        <span className="opacity-85">reason:</span>
                                        <span className="opacity-100">{h.reason}</span>
                                      </>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}

                        {editEnabled ? (
                          <div className="mt-2 text-[11px] text-[#f5c84c] truncate">
                            Edit enabled: {String(editReasonByTaskRef.current[String(t.id || "")] || "")}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-3 py-2 border border-white/10">
                        <input
                          className="min-w-[160px] w-full border border-white/10 rounded-md px-2 py-2 bg-white/10 text-white no-print disabled:opacity-60"
                          value={t.note || ""}
                          onChange={(e) => updateTask(t.id, { note: e.target.value })}
                          placeholder={locked && !canEdit ? "Locked" : "Optional note..."}
                          disabled={saving || !canEdit}
                          title={locked && !canEdit ? "Locked. Click Edit (reason required) to modify." : ""}
                        />
                        <div className="hidden print:block">{t.note || ""}</div>
                      </td>

                      <td className="no-print px-3 py-2 border border-white/10">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <button
                            className="px-3 py-2 rounded-md border border-white/20 hover:bg-white/10 text-xs disabled:opacity-50"
                            onClick={() => handleNow(t.id)}
                            disabled={saving || locked}
                            title={locked ? "Already locked" : "Stamp timestamp + lock this task"}
                          >
                            Now
                          </button>

                          <button
                            className="px-3 py-2 rounded-md border border-white/20 hover:bg-white/10 text-xs disabled:opacity-50"
                            onClick={() => openEditTask(t)}
                            disabled={saving || !locked}
                            title={locked ? "Edit locked task (reason required)" : "Available after Now"}
                          >
                            Edit
                          </button>

                          <button
                            className="px-3 py-2 rounded-md border border-white/20 hover:bg-white/10 text-xs disabled:opacity-50"
                            onClick={() => saveTaskOnly(String(t.id || ""))}
                            disabled={saving || !editEnabled}
                            title={editEnabled ? "Save changes for this task" : "Enable Edit first"}
                          >
                            Save
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {(visibleTasks || []).length === 0 ? (
                  <tr>
                    <td className={`px-3 py-6 text-center border border-white/10 ${softText}`} colSpan={7}>
                      No tasks for this POC (based on Days Of Week).
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="no-print mt-4 flex items-center justify-end gap-2">
            <button className={btn} onClick={() => load()} disabled={saving}>
              Reload
            </button>
            <button className={btn} onClick={() => save("DRAFT")} disabled={saving}>
              Save Draft
            </button>
            <button className={btnPrimary} onClick={() => save("SUBMITTED")} disabled={saving}>
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}