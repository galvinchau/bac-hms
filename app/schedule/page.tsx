"use client";

import { useEffect, useMemo, useState } from "react";

// ===== Types =====

type Individual = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
};

type Service = {
  id: string;
  serviceCode: string;
  serviceName: string;
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
};

type MasterTemplateShift = {
  id: string;
  dayOfWeek: number; // 0-6
  startMinutes: number;
  endMinutes: number;
  serviceId: string;
  service?: Service;
  defaultDsp?: Employee | null;
  notes?: string | null;
};

type MasterScheduleTemplate = {
  id: string;
  individualId: string;
  name: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  notes?: string | null;
  shifts: MasterTemplateShift[];
};

type Visit = {
  id: string;
  checkInAt: string;
  checkOutAt: string | null;
  units: number | null;
};

type ScheduleShift = {
  id: string;
  scheduleDate: string;
  plannedStart: string;
  plannedEnd: string;
  status: string;
  billable: boolean;
  notes: string | null;
  service: Service;
  plannedDsp?: Employee | null;
  actualDsp?: Employee | null;
  visits: Visit[];
};

type ScheduleWeek = {
  id: string;
  individualId: string;
  weekStart: string;
  weekEnd: string;
  templateId: string | null;
  locked: boolean;
  shifts: ScheduleShift[];
};

type WeekApiResponse = {
  week: ScheduleWeek | null;
  created?: boolean;
  regenerated?: boolean;
};

type MasterApiResponse = MasterScheduleTemplate[];

type IndividualsApiResponse = Individual[];

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ActiveTab = "weekly" | "summary" | "payroll";

// ===== Helpers =====

function startOfWeekSunday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateShort(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month.toString().padStart(2, "0")}/${day
    .toString()
    .padStart(2, "0")}/${year}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const hh = hours.toString().padStart(2, "0");
  const mm = minutes.toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatMinutesRange(start: number, end: number): string {
  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h.toString().padStart(2, "0")}:${min
      .toString()
      .padStart(2, "0")}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

function minutesToUnits(minutes: number): number {
  return Math.round(minutes / 15);
}

function parseTimeToMinutes(time: string): number | null {
  const [hh, mm] = time.split(":");
  const h = Number(hh);
  const m = Number(mm);
  if (
    Number.isNaN(h) ||
    Number.isNaN(m) ||
    h < 0 ||
    h > 23 ||
    m < 0 ||
    m > 59
  ) {
    return null;
  }
  return h * 60 + m;
}

function calcScheduledUnits(shift: ScheduleShift): number {
  const minutes =
    (new Date(shift.plannedEnd).getTime() -
      new Date(shift.plannedStart).getTime()) /
    (1000 * 60);
  return minutesToUnits(minutes);
}

function calcVisitedUnits(shift: ScheduleShift): number {
  return shift.visits.reduce((sum, v) => sum + (v.units ?? 0), 0);
}

/**
 * Tính vị trí trong tuần (0–6) của một scheduleDate dựa theo weekStart (ISO string).
 * Không dùng getDay/getUTCDay để tránh lệch timezone.
 */
function getDayIndexInWeek(weekStartIso: string, dateIso: string): number {
  const ws = new Date(weekStartIso);
  ws.setHours(0, 0, 0, 0);

  const d = new Date(dateIso);
  d.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (d.getTime() - ws.getTime()) / (1000 * 60 * 60 * 24)
  );

  return diffDays;
}

// ===== Page Component =====

export default function SchedulePage() {
  const [individuals, setIndividuals] = useState<Individual[]>([]);
  const [selectedIndividualId, setSelectedIndividualId] = useState<string>("");

  const [services, setServices] = useState<Service[]>([]);
  const [dsps, setDsps] = useState<Employee[]>([]);

  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeekSunday(new Date())
  );

  const [masterTemplates, setMasterTemplates] = useState<
    MasterScheduleTemplate[]
  >([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<MasterScheduleTemplate | null>(null);

  const [masterDraft, setMasterDraft] = useState<MasterScheduleTemplate | null>(
    null
  );

  const [currentWeek, setCurrentWeek] = useState<ScheduleWeek | null>(null);

  const [loadingMaster, setLoadingMaster] = useState(false);
  const [savingMaster, setSavingMaster] = useState(false);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [generatingWeek, setGeneratingWeek] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // inline add event (master)
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editServiceId, setEditServiceId] = useState<string>("");
  const [editStart, setEditStart] = useState<string>("07:00");
  const [editEnd, setEditEnd] = useState<string>("14:00");

  const [activeTab, setActiveTab] = useState<ActiveTab>("weekly");

  // Modal edit shift (weekly)
  const [editingShift, setEditingShift] = useState<ScheduleShift | null>(null);
  const [editShiftServiceId, setEditShiftServiceId] = useState<string>("");
  const [editShiftDspId, setEditShiftDspId] = useState<string>("");
  const [editShiftStart, setEditShiftStart] = useState<string>("07:00");
  const [editShiftEnd, setEditShiftEnd] = useState<string>("14:00");
  const [editShiftStatus, setEditShiftStatus] = useState<string>("NOT_STARTED");
  const [editShiftNotes, setEditShiftNotes] = useState<string>("");
  const [editShiftSaving, setEditShiftSaving] = useState(false);
  const [editShiftDeleting, setEditShiftDeleting] = useState(false);

  // Modal edit master event
  const [editingMasterShift, setEditingMasterShift] =
    useState<MasterTemplateShift | null>(null);
  const [masterModalServiceId, setMasterModalServiceId] = useState<string>("");
  const [masterModalDspId, setMasterModalDspId] = useState<string>("");
  const [masterModalStart, setMasterModalStart] = useState<string>("07:00");
  const [masterModalEnd, setMasterModalEnd] = useState<string>("14:00");
  const [masterModalNotes, setMasterModalNotes] = useState<string>("");
  const [masterModalSaving, setMasterModalSaving] = useState(false);

  // Modal generate multi weeks
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateWeeksCount, setGenerateWeeksCount] = useState<number>(1);

  // Modal create new shift
  const [showCreateShiftModal, setShowCreateShiftModal] = useState(false);
  const [creatingShift, setCreatingShift] = useState(false);
  const [createShiftDayIndex, setCreateShiftDayIndex] = useState<number>(0);
  const [createShiftServiceId, setCreateShiftServiceId] = useState<string>("");
  const [createShiftDspId, setCreateShiftDspId] = useState<string>("");
  const [createShiftStart, setCreateShiftStart] = useState<string>("07:00");
  const [createShiftEnd, setCreateShiftEnd] = useState<string>("14:00");
  const [createShiftStatus, setCreateShiftStatus] =
    useState<string>("NOT_STARTED");
  const [createShiftNotes, setCreateShiftNotes] = useState<string>("");

  const shiftStatusOptions = [
    "NOT_STARTED",
    "IN_PROGRESS",
    "COMPLETED",
    "NOT_COMPLETED",
    "CANCELLED",
    "BACKUP_PLAN",
  ];

  // --------- load Individuals (simple=true) ---------
  useEffect(() => {
    async function fetchIndividuals() {
      try {
        const res = await fetch("/api/individuals?simple=true");
        if (!res.ok) return;
        const data = (await res.json()) as IndividualsApiResponse;
        const arr = Array.isArray(data) ? data : [];
        setIndividuals(arr);
        if (arr.length > 0 && !selectedIndividualId) {
          setSelectedIndividualId(arr[0].id);
        }
      } catch (e) {
        console.error("Failed to load individuals", e);
      }
    }
    fetchIndividuals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------- load Services ---------
  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch("/api/services");
        if (!res.ok) return;
        const data = await res.json();
        const list: Service[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.services)
          ? data.services
          : [];
        setServices(list);
      } catch (e) {
        console.error("Failed to load services", e);
      }
    }
    fetchServices();
  }, []);

  // --------- load DSPs (Employees – simple) ---------
  useEffect(() => {
    async function fetchDsps() {
      try {
        const res = await fetch("/api/employees?simple=true");
        if (!res.ok) return;
        const data = await res.json();
        const list: Employee[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : [];
        setDsps(list);
      } catch (e) {
        console.error("Failed to load DSPs", e);
      }
    }
    fetchDsps();
  }, []);

  // --------- load Master template khi đổi Individual ---------
  useEffect(() => {
    if (!selectedIndividualId) {
      setMasterTemplates([]);
      setSelectedTemplate(null);
      setMasterDraft(null);
      return;
    }

    async function fetchMaster() {
      setLoadingMaster(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/schedule/master?individualId=${selectedIndividualId}&activeOnly=true`
        );
        if (!res.ok) {
          throw new Error("Failed to load master templates");
        }
        const data = (await res.json()) as MasterApiResponse;
        const arr = Array.isArray(data) ? data : [];
        setMasterTemplates(arr);
        const first = arr[0] ?? null;
        setSelectedTemplate(first);

        if (first) {
          setMasterDraft({
            ...first,
            shifts: [...first.shifts],
          });
        } else {
          setMasterDraft(null);
        }
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "Failed to load master schedule");
      } finally {
        setLoadingMaster(false);
      }
    }

    fetchMaster();
  }, [selectedIndividualId]);

  // --------- load Weekly schedule khi đổi Individual hoặc tuần ---------
  useEffect(() => {
    if (!selectedIndividualId) {
      setCurrentWeek(null);
      return;
    }

    async function fetchWeek() {
      setLoadingWeek(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/schedule/week?individualId=${selectedIndividualId}&weekStart=${weekStart.toISOString()}`
        );
        if (!res.ok) {
          throw new Error("Failed to load weekly schedule");
        }
        const data = (await res.json()) as WeekApiResponse;
        setCurrentWeek(data.week ?? null);
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "Failed to load weekly schedule");
      } finally {
        setLoadingWeek(false);
      }
    }

    fetchWeek();
  }, [selectedIndividualId, weekStart]);

  // --------- Generate multi-weeks helper ---------

  async function generateWeekAt(startDate: Date): Promise<ScheduleWeek | null> {
    if (!selectedIndividualId) return null;

    const res = await fetch("/api/schedule/week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        individualId: selectedIndividualId,
        weekStart: startDate.toISOString(),
        templateId: selectedTemplate?.id ?? undefined,
        regenerate: true,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || "Failed to generate week");
    }

    const data = (await res.json()) as WeekApiResponse;
    return data.week ?? null;
  }

  function handleGenerateWeek() {
    if (!selectedIndividualId || generatingWeek) return;
    setGenerateWeeksCount(1);
    setShowGenerateModal(true);
    setError(null);
    setSuccess(null);
  }

  async function handleConfirmGenerateWeeks() {
    if (!selectedIndividualId) return;

    try {
      setGeneratingWeek(true);
      setError(null);
      setSuccess(null);

      const count = Math.max(1, Math.min(4, Number(generateWeeksCount) || 1));

      let firstWeek: ScheduleWeek | null = null;

      for (let i = 0; i < count; i++) {
        const targetStart = addDays(weekStart, i * 7);
        const generated = await generateWeekAt(targetStart);
        if (i === 0 && generated) {
          firstWeek = generated;
        }
      }

      if (firstWeek) {
        setCurrentWeek(firstWeek);
      }

      setShowGenerateModal(false);
      setSuccess(
        count === 1
          ? "Weekly schedule generated successfully."
          : `Weekly schedules generated for ${count} weeks successfully.`
      );
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Failed to generate weekly schedule");
    } finally {
      setGeneratingWeek(false);
    }
  }

  function handlePrevWeek() {
    const prev = addDays(weekStart, -7);
    setWeekStart(startOfWeekSunday(prev));
  }

  function handleNextWeek() {
    const next = addDays(weekStart, 7);
    setWeekStart(startOfWeekSunday(next));
  }

  const weekRangeLabel = useMemo(() => {
    const start = weekStart;
    const end = addDays(weekStart, 6);
    return `${formatDateShort(start)} – ${formatDateShort(end)}`;
  }, [weekStart]);

  // ---------- Tính grid weekly ----------
  const gridByDayAndSlot = useMemo(() => {
    if (!currentWeek) return { maxSlots: 0, slots: [] as ScheduleShift[][] };

    const byDay: ScheduleShift[][] = Array.from({ length: 7 }, () => []);

    for (const shift of currentWeek.shifts) {
      const dayIndex = getDayIndexInWeek(
        currentWeek.weekStart,
        shift.scheduleDate
      );

      if (dayIndex >= 0 && dayIndex <= 6) {
        byDay[dayIndex].push(shift);
      }
    }

    const maxSlots = byDay.reduce((max, arr) => {
      arr.sort(
        (a, b) =>
          new Date(a.plannedStart).getTime() -
          new Date(b.plannedStart).getTime()
      );
      return Math.max(max, arr.length);
    }, 0);

    const slots: ScheduleShift[][] = [];
    for (let slot = 0; slot < maxSlots; slot++) {
      const row: ScheduleShift[] = [];
      for (let day = 0; day < 7; day++) {
        row.push(byDay[day][slot] ?? (null as any));
      }
      slots.push(row);
    }

    return { maxSlots, slots };
  }, [currentWeek]);

  // ---------- Master template editing ----------

  function ensureDraftBase(): MasterScheduleTemplate | null {
    if (!selectedIndividualId) return null;
    if (masterDraft) return masterDraft;
    const nowIso = new Date().toISOString();
    const base: MasterScheduleTemplate = {
      id: selectedTemplate?.id ?? "draft",
      individualId: selectedIndividualId,
      name: selectedTemplate?.name ?? "Default week",
      effectiveFrom: selectedTemplate?.effectiveFrom ?? nowIso,
      effectiveTo: selectedTemplate?.effectiveTo ?? null,
      isActive: selectedTemplate?.isActive ?? true,
      notes: selectedTemplate?.notes ?? null,
      shifts: [],
    };
    setMasterDraft(base);
    return base;
  }

  function handleStartAddShift(dayIndex: number) {
    if (!selectedIndividualId) return;
    if (!services.length) {
      setError("No services found. Please create at least one Service first.");
      return;
    }
    setEditingDay(dayIndex);
    setEditServiceId(services[0]?.id ?? "");
    setEditStart("07:00");
    setEditEnd("14:00");
  }

  function handleCancelAddShift() {
    setEditingDay(null);
  }

  function handleConfirmAddShift() {
    if (editingDay === null) return;
    if (!editServiceId) {
      setError("Please select a Service for this Event.");
      return;
    }
    const start = parseTimeToMinutes(editStart);
    const end = parseTimeToMinutes(editEnd);
    if (start === null || end === null) {
      setError("Time is not valid. Use HH:MM format (e.g. 07:00).");
      return;
    }

    const base = ensureDraftBase();
    if (!base) return;

    const svc = services.find((s) => s.id === editServiceId);

    const newShift: MasterTemplateShift = {
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      dayOfWeek: editingDay,
      startMinutes: start,
      endMinutes: end,
      serviceId: editServiceId,
      service: svc,
      defaultDsp: null,
      notes: null,
    };

    setMasterDraft({
      ...base,
      shifts: [...base.shifts, newShift],
    });

    setEditingDay(null);
  }

  function openEditMasterShift(shift: MasterTemplateShift) {
    setEditingMasterShift(shift);
    setMasterModalServiceId(shift.serviceId);
    setMasterModalDspId(shift.defaultDsp?.id ?? "");
    setMasterModalStart(
      (() => {
        const h = Math.floor(shift.startMinutes / 60)
          .toString()
          .padStart(2, "0");
        const m = (shift.startMinutes % 60).toString().padStart(2, "0");
        return `${h}:${m}`;
      })()
    );
    setMasterModalEnd(
      (() => {
        const h = Math.floor(shift.endMinutes / 60)
          .toString()
          .padStart(2, "0");
        const m = (shift.endMinutes % 60).toString().padStart(2, "0");
        return `${h}:${m}`;
      })()
    );
    setMasterModalNotes(shift.notes ?? "");
  }

  function closeEditMasterShift() {
    setEditingMasterShift(null);
    setMasterModalSaving(false);
  }

  function handleDeleteMasterShiftFromModal() {
    if (!editingMasterShift || !masterDraft) return;
    setMasterDraft({
      ...masterDraft,
      shifts: masterDraft.shifts.filter((s) => s.id !== editingMasterShift.id),
    });
    closeEditMasterShift();
  }

  function handleApplyMasterShiftEdit() {
    if (!editingMasterShift || !masterDraft) return;
    if (!masterModalServiceId) {
      setError("Please select a Service.");
      return;
    }

    const start = parseTimeToMinutes(masterModalStart);
    const end = parseTimeToMinutes(masterModalEnd);
    if (start === null || end === null) {
      setError("Time is not valid. Use HH:MM format (e.g. 07:00).");
      return;
    }

    const svc = services.find((s) => s.id === masterModalServiceId) ?? null;
    const dsp = dsps.find((d) => d.id === masterModalDspId) ?? null;

    const updatedShifts = masterDraft.shifts.map((s) =>
      s.id === editingMasterShift.id
        ? {
            ...s,
            serviceId: masterModalServiceId,
            service: svc ?? undefined,
            defaultDsp: dsp ?? null,
            startMinutes: start,
            endMinutes: end,
            notes: masterModalNotes || null,
          }
        : s
    );

    setMasterDraft({
      ...masterDraft,
      shifts: updatedShifts,
    });

    closeEditMasterShift();
  }

  async function handleSaveMasterTemplate() {
    if (!selectedIndividualId) return;
    const draft = ensureDraftBase();
    if (!draft) return;
    if (!draft.shifts.length) {
      setError("Master Schedule is empty. Please add at least one Event.");
      return;
    }

    try {
      setSavingMaster(true);
      setError(null);
      setSuccess(null);

      const payload = {
        name: draft.name,
        effectiveFrom: draft.effectiveFrom,
        effectiveTo: draft.effectiveTo,
        isActive: draft.isActive,
        notes: draft.notes ?? null,
        shifts: draft.shifts.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          serviceId: s.serviceId,
          startMinutes: s.startMinutes,
          endMinutes: s.endMinutes,
          defaultDspId: s.defaultDsp?.id ?? null,
          billable: true,
          notes: s.notes ?? null,
        })),
      };

      let res: Response;
      let savedTemplate: MasterScheduleTemplate;

      if (selectedTemplate && selectedTemplate.id !== "draft") {
        // UPDATE existing
        res = await fetch(`/api/schedule/master/${selectedTemplate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedTemplate.id,
            ...payload,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "FAILED_TO_UPDATE_MASTER");
        }
        savedTemplate = (await res.json()) as MasterScheduleTemplate;
      } else {
        // CREATE new
        res = await fetch("/api/schedule/master", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            individualId: selectedIndividualId,
            ...payload,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "FAILED_TO_CREATE_MASTER");
        }
        savedTemplate = (await res.json()) as MasterScheduleTemplate;
      }

      setSelectedTemplate(savedTemplate);
      setMasterTemplates([savedTemplate]);
      setMasterDraft({
        ...savedTemplate,
        shifts: [...savedTemplate.shifts],
      });
      setSuccess("Master schedule saved successfully.");
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "FAILED_TO_UPDATE_MASTER");
    } finally {
      setSavingMaster(false);
    }
  }

  function handleResetMasterDraft() {
    if (selectedTemplate) {
      setMasterDraft({
        ...selectedTemplate,
        shifts: [...selectedTemplate.shifts],
      });
    } else {
      setMasterDraft(null);
    }
    setEditingDay(null);
  }

  // ---------- Summary & conflicts / payroll ----------

  const summaryByService = useMemo(() => {
    if (!currentWeek)
      return [] as {
        service: Service;
        scheduledUnits: number;
        visitedUnits: number;
      }[];

    const map = new Map<
      string,
      { service: Service; scheduledUnits: number; visitedUnits: number }
    >();

    for (const s of currentWeek.shifts) {
      const key = s.service.id;
      if (!map.has(key)) {
        map.set(key, {
          service: s.service,
          scheduledUnits: 0,
          visitedUnits: 0,
        });
      }
      const item = map.get(key)!;
      item.scheduledUnits += calcScheduledUnits(s);
      item.visitedUnits += calcVisitedUnits(s);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.service.serviceCode.localeCompare(b.service.serviceCode)
    );
  }, [currentWeek]);

  const summaryByDsp = useMemo(() => {
    if (!currentWeek)
      return [] as {
        dspId: string;
        dspName: string;
        scheduledUnits: number;
        visitedUnits: number;
      }[];

    const map = new Map<
      string,
      {
        dspId: string;
        dspName: string;
        scheduledUnits: number;
        visitedUnits: number;
      }
    >();

    for (const s of currentWeek.shifts) {
      const dsp = s.actualDsp ?? s.plannedDsp;
      if (!dsp) continue;
      const key = dsp.id;
      if (!map.has(key)) {
        map.set(key, {
          dspId: dsp.id,
          dspName: `${dsp.firstName} ${dsp.lastName}`,
          scheduledUnits: 0,
          visitedUnits: 0,
        });
      }
      const item = map.get(key)!;
      item.scheduledUnits += calcScheduledUnits(s);
      item.visitedUnits += calcVisitedUnits(s);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.dspName.localeCompare(b.dspName)
    );
  }, [currentWeek]);

  const conflicts = useMemo(() => {
    if (!currentWeek)
      return [] as {
        dspName: string;
        date: string;
        dayIndex: number;
        shifts: ScheduleShift[];
      }[];

    const result: {
      dspName: string;
      date: string;
      dayIndex: number;
      shifts: ScheduleShift[];
    }[] = [];

    const byKey: Record<string, ScheduleShift[]> = {};

    for (const s of currentWeek.shifts) {
      const dsp = s.actualDsp ?? s.plannedDsp;
      if (!dsp) continue;

      const dayIndex = getDayIndexInWeek(currentWeek.weekStart, s.scheduleDate);
      if (dayIndex < 0 || dayIndex > 6) continue;

      const key = `${dsp.id}-${dayIndex}`;
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(s);
    }

    for (const [key, arr] of Object.entries(byKey)) {
      arr.sort(
        (a, b) =>
          new Date(a.plannedStart).getTime() -
          new Date(b.plannedStart).getTime()
      );
      for (let i = 0; i < arr.length - 1; i++) {
        const current = arr[i];
        const next = arr[i + 1];
        if (
          new Date(current.plannedEnd).getTime() >
          new Date(next.plannedStart).getTime()
        ) {
          const [, dayStr] = key.split("-");
          const dsp = (current.actualDsp ?? current.plannedDsp)!;
          result.push({
            dspName: `${dsp.firstName} ${dsp.lastName}`,
            date: current.scheduleDate,
            dayIndex: Number(dayStr),
            shifts: [current, next],
          });
        }
      }
    }

    return result;
  }, [currentWeek]);

  // ---------- Edit weekly shift (modal) ----------

  function openEditShift(shift: ScheduleShift) {
    setEditingShift(shift);
    setEditShiftServiceId(shift.service.id);
    setEditShiftDspId(shift.actualDsp?.id ?? shift.plannedDsp?.id ?? "");
    setEditShiftStart(formatTime(shift.plannedStart));
    setEditShiftEnd(formatTime(shift.plannedEnd));
    setEditShiftStatus(shift.status);
    setEditShiftNotes(shift.notes ?? "");
  }

  function closeEditShift() {
    setEditingShift(null);
    setEditShiftSaving(false);
    setEditShiftDeleting(false);
  }

  async function handleSaveShiftEdit() {
    if (!editingShift) return;

    const startMinutes = parseTimeToMinutes(editShiftStart);
    const endMinutes = parseTimeToMinutes(editShiftEnd);

    if (startMinutes === null || endMinutes === null) {
      setError("Time is not valid. Use HH:MM format (e.g. 07:00).");
      return;
    }

    const baseDate = new Date(editingShift.scheduleDate);
    baseDate.setHours(0, 0, 0, 0);

    const makeDate = (base: Date, minutes: number) => {
      const d = new Date(base);
      d.setMinutes(minutes);
      return d.toISOString();
    };

    const plannedStartIso = makeDate(baseDate, startMinutes);
    const endBase =
      endMinutes >= startMinutes ? baseDate : addDays(baseDate, 1);
    const plannedEndIso = makeDate(endBase, endMinutes);

    try {
      setEditShiftSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetch(`/api/schedule/shift/${editingShift.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // gửi kèm shiftId cho thống nhất với backend
          shiftId: editingShift.id,
          serviceId: editShiftServiceId || editingShift.service.id,
          plannedStart: plannedStartIso,
          plannedEnd: plannedEndIso,
          status: editShiftStatus,
          notes: editShiftNotes || null,
          dspId: editShiftDspId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update shift");
      }

      const updated = (await res.json()) as ScheduleShift;

      setCurrentWeek((prev) =>
        prev
          ? {
              ...prev,
              shifts: prev.shifts.map((s) =>
                s.id === updated.id ? updated : s
              ),
            }
          : prev
      );

      setSuccess("Shift updated successfully.");
      closeEditShift();
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Failed to update shift");
      setEditShiftSaving(false);
    }
  }

  async function handleDeleteShiftFromModal() {
    if (!editingShift) return;
    if (!currentWeek) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this shift?"
    );
    if (!confirmed) return;

    try {
      setEditShiftDeleting(true);
      setError(null);
      setSuccess(null);

      const res = await fetch(`/api/schedule/shift/${editingShift.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // gửi kèm shiftId cho thống nhất với backend
          shiftId: editingShift.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete shift");
      }

      setCurrentWeek((prev) =>
        prev
          ? {
              ...prev,
              shifts: prev.shifts.filter((s) => s.id !== editingShift.id),
            }
          : prev
      );

      setSuccess("Shift deleted successfully.");
      closeEditShift();
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Failed to delete shift");
      setEditShiftDeleting(false);
    }
  }

  // ---------- Create new shift (modal) ----------

  function openCreateShiftModal() {
    if (!currentWeek) {
      setError("No weekly schedule. Please Generate first.");
      return;
    }
    if (!services.length) {
      setError("No services found. Please create at least one Service first.");
      return;
    }

    setCreateShiftDayIndex(0);
    setCreateShiftServiceId(services[0]?.id ?? "");
    setCreateShiftDspId("");
    setCreateShiftStart("07:00");
    setCreateShiftEnd("14:00");
    setCreateShiftStatus("NOT_STARTED");
    setCreateShiftNotes("");
    setShowCreateShiftModal(true);
    setError(null);
    setSuccess(null);
  }

  function closeCreateShiftModal() {
    if (creatingShift) return;
    setShowCreateShiftModal(false);
  }

  async function handleCreateShift() {
    if (!currentWeek || !selectedIndividualId) return;

    const startMinutes = parseTimeToMinutes(createShiftStart);
    const endMinutes = parseTimeToMinutes(createShiftEnd);

    if (startMinutes === null || endMinutes === null) {
      setError("Time is not valid. Use HH:MM format (e.g. 07:00).");
      return;
    }

    const baseWeekStart = currentWeek
      ? new Date(currentWeek.weekStart)
      : weekStart;
    const baseDate = addDays(baseWeekStart, createShiftDayIndex);
    baseDate.setHours(0, 0, 0, 0);
    const scheduleDateIso = baseDate.toISOString();

    const makeDate = (base: Date, minutes: number) => {
      const d = new Date(base);
      d.setMinutes(minutes);
      return d.toISOString();
    };

    const plannedStartIso = makeDate(baseDate, startMinutes);
    const endBase =
      endMinutes >= startMinutes ? baseDate : addDays(baseDate, 1);
    const plannedEndIso = makeDate(endBase, endMinutes);

    try {
      setCreatingShift(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/schedule/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekId: currentWeek.id,
          individualId: selectedIndividualId,
          scheduleDate: scheduleDateIso,
          serviceId: createShiftServiceId,
          plannedStart: plannedStartIso,
          plannedEnd: plannedEndIso,
          status: createShiftStatus,
          notes: createShiftNotes || null,
          dspId: createShiftDspId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to create shift");
      }

      const created = (await res.json()) as ScheduleShift;

      setCurrentWeek((prev) =>
        prev
          ? {
              ...prev,
              shifts: [...prev.shifts, created],
            }
          : prev
      );

      setSuccess("Shift created successfully.");
      setShowCreateShiftModal(false);
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Failed to create shift");
    } finally {
      setCreatingShift(false);
    }
  }

  // ---------- render helpers ----------

  function renderMasterDayCard(dayIndex: number) {
    const shifts =
      masterDraft?.shifts
        .filter((s) => s.dayOfWeek === dayIndex)
        .sort((a, b) => a.startMinutes - b.startMinutes) ?? [];

    const isEditingThisDay = editingDay === dayIndex;

    return (
      <div className="h-full flex flex-col rounded-2xl border border-slate-700/60 bg-slate-900/40 px-4 py-3 text-sm text-slate-200">
        <div className="font-semibold text-slate-100 flex items-center justify-between mb-2">
          <span>{dayLabels[dayIndex]}</span>
        </div>

        {shifts.length === 0 && !isEditingThisDay && (
          <div className="text-xs italic text-slate-500 flex-1 flex items-center">
            No master template
          </div>
        )}

        <div className="space-y-2">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs"
            >
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-emerald-300">
                  {shift.service?.serviceCode || "SVC"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-[2px] text-[10px] font-medium text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Active
                </span>
              </div>
              <div className="text-slate-300 mb-1">
                {formatMinutesRange(shift.startMinutes, shift.endMinutes)}
              </div>
              {shift.defaultDsp && (
                <div className="text-[11px] text-slate-400 mb-1">
                  DSP: {shift.defaultDsp.firstName} {shift.defaultDsp.lastName}
                </div>
              )}
              <button
                type="button"
                className="mt-1 text-[11px] text-sky-300 hover:text-sky-100"
                onClick={() => openEditMasterShift(shift)}
              >
                Edit event
              </button>
            </div>
          ))}

          {isEditingThisDay && (
            <div className="rounded-xl border border-dashed border-slate-600 bg-slate-950/60 px-3 py-2 text-xs space-y-2">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-300">Service</span>
                <select
                  value={editServiceId}
                  onChange={(e) => setEditServiceId(e.target.value)}
                  className="h-7 rounded-md bg-slate-900 border border-slate-700 px-2 text-xs"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.serviceCode} — {s.serviceName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-[11px] text-slate-300">Start</span>
                  <input
                    type="time"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="h-7 rounded-md bg-slate-900 border border-slate-700 px-2 text-xs"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-[11px] text-slate-300">End</span>
                  <input
                    type="time"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="h-7 rounded-md bg-slate-900 border border-slate-700 px-2 text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="text-[11px] text-slate-400 hover:text-slate-200"
                  onClick={handleCancelAddShift}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="text-[11px] rounded-full bg-emerald-500 px-3 py-1 font-semibold text-slate-950 hover:bg-emerald-400"
                  onClick={handleConfirmAddShift}
                >
                  Save event
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto pt-2">
          {!isEditingThisDay && (
            <button
              type="button"
              disabled={!selectedIndividualId}
              onClick={() => handleStartAddShift(dayIndex)}
              className="text-[11px] text-sky-300 hover:text-sky-200 disabled:opacity-40"
            >
              + Event
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderShiftCell(shift: ScheduleShift | null) {
    if (!shift) {
      return (
        <div className="h-full rounded-2xl border border-dashed border-slate-700/40 bg-slate-900/10 flex items-center justify-center text-xs text-slate-600">
          No shift
        </div>
      );
    }

    const scheduledUnits = calcScheduledUnits(shift);
    const visitedUnits = calcVisitedUnits(shift);
    const deltaUnits = visitedUnits - scheduledUnits;

    const dsp =
      shift.actualDsp ?? shift.plannedDsp ?? (null as unknown as Employee);

    const statusColor =
      shift.status === "COMPLETED"
        ? "text-emerald-400"
        : shift.status === "IN_PROGRESS"
        ? "text-amber-300"
        : shift.status === "CANCELLED"
        ? "text-rose-400"
        : shift.status === "BACKUP_PLAN"
        ? "text-sky-300"
        : "text-slate-400";

    return (
      <div className="h-full rounded-2xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-100 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <div className="font-semibold text-emerald-300">
            {shift.service.serviceCode}
          </div>
          <div className={`text-[10px] uppercase tracking-wide ${statusColor}`}>
            {shift.status.replace("_", " ")}
          </div>
        </div>

        {dsp && (
          <div className="text-[11px] text-slate-300 mb-1">
            {dsp.firstName} {dsp.lastName}
          </div>
        )}

        <div className="flex justify-between text-[11px] text-slate-300 mb-1">
          <span>
            Sched: {formatTime(shift.plannedStart)}–
            {formatTime(shift.plannedEnd)}
          </span>
          <span>{scheduledUnits}u</span>
        </div>

        <div className="flex justify-between text-[11px] text-slate-300 mb-1">
          <span>
            Visit:{" "}
            {shift.visits.length > 0
              ? `${formatTime(shift.visits[0].checkInAt)}–${
                  shift.visits[0].checkOutAt
                    ? formatTime(shift.visits[0].checkOutAt)
                    : "--:--"
                }`
              : "--:-- – --:--"}
          </span>
          <span>{visitedUnits}u</span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-1 border-t border-slate-700/60 text-[11px] text-slate-400">
          <span>Δ {deltaUnits}u</span>
          <button
            type="button"
            className="text-[11px] underline decoration-dotted hover:text-sky-300"
            onClick={() => openEditShift(shift)}
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  const currentIndividual = Array.isArray(individuals)
    ? individuals.find((i) => i.id === selectedIndividualId)
    : undefined;

  // ===== Render =====

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="px-6 pb-10 pt-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
            <p className="text-sm text-slate-400">
              Weekly master schedule, generated shifts, and summary for DSPs and
              Individuals.
            </p>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-slate-900/60 px-4 py-3 border border-slate-700/60">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Individual</span>
            <select
              value={selectedIndividualId}
              onChange={(e) => setSelectedIndividualId(e.target.value)}
              className="h-9 rounded-lg bg-slate-900 border border-slate-700 px-3 text-sm"
            >
              {individuals.length === 0 && (
                <option value="">No Individuals</option>
              )}
              {individuals.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.code} — {ind.lastName} {ind.firstName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1" />

          <div className="flex flex-col gap-1 items-end">
            <span className="text-xs text-slate-400">Generate weekly</span>
            <button
              type="button"
              onClick={handleGenerateWeek}
              disabled={!selectedIndividualId || generatingWeek}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow hover:bg-emerald-400 disabled:opacity-50"
            >
              {generatingWeek ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>

        {/* Info + errors / success */}
        {currentIndividual && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs text-slate-300 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-100">
                {currentIndividual.lastName} {currentIndividual.firstName}
              </div>
              <div className="text-[11px] text-slate-400">
                ID: {currentIndividual.code}
              </div>
            </div>
            {selectedTemplate && (
              <div className="text-right text-[11px] text-slate-400">
                <div>
                  Active template:{" "}
                  <span className="font-medium text-emerald-300">
                    {selectedTemplate.name || "Default week"}
                  </span>
                </div>
                <div>
                  Effective: {formatDateShort(selectedTemplate.effectiveFrom)} –{" "}
                  {selectedTemplate.effectiveTo
                    ? formatDateShort(selectedTemplate.effectiveTo)
                    : "open-ended"}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-600/60 bg-rose-950/40 px-4 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-600/60 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-200">
            {success}
          </div>
        )}

        {/* Master Schedule section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">
              Master Schedule (Sunday–Saturday)
            </h2>
            <div className="flex items-center gap-3">
              {loadingMaster && (
                <span className="text-[11px] text-slate-400">
                  Loading master schedule...
                </span>
              )}
              <button
                type="button"
                onClick={handleResetMasterDraft}
                className="text-[11px] text-slate-400 hover:text-slate-100"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSaveMasterTemplate}
                disabled={savingMaster || !selectedIndividualId}
                className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow hover:bg-sky-400 disabled:opacity-50"
              >
                {savingMaster ? "Saving..." : "Save Master schedule"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-3">
            {dayLabels.map((_, idx) => (
              <div key={idx}>{renderMasterDayCard(idx)}</div>
            ))}
          </div>
        </section>

        {/* Weekly Detail + tabs */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h2 className="text-sm font-semibold text-slate-100">
                Weekly schedule (Sunday–Saturday)
              </h2>

              {/* Week navigation moved here */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Week</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevWeek}
                    className="h-8 rounded-full border border-slate-700 px-3 text-xs hover:bg-slate-800"
                  >
                    Prev
                  </button>
                  <span className="text-sm font-medium">{weekRangeLabel}</span>
                  <button
                    type="button"
                    onClick={handleNextWeek}
                    className="h-8 rounded-full border border-slate-700 px-3 text-xs hover:bg-slate-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-900/60 px-1 py-1 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab("weekly")}
                  className={`px-3 py-1 rounded-full ${
                    activeTab === "weekly"
                      ? "bg-slate-100 text-slate-950"
                      : "text-slate-300 hover:text-slate-50"
                  }`}
                >
                  Weekly detail
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("summary")}
                  className={`px-3 py-1 rounded-full ${
                    activeTab === "summary"
                      ? "bg-slate-100 text-slate-950"
                      : "text-slate-300 hover:text-slate-50"
                  }`}
                >
                  Summary & conflicts
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("payroll")}
                  className={`px-3 py-1 rounded-full ${
                    activeTab === "payroll"
                      ? "bg-slate-100 text-slate-950"
                      : "text-slate-300 hover:text-slate-50"
                  }`}
                >
                  Payroll & ISP
                </button>
              </div>

              {loadingWeek && (
                <span className="text-[11px] text-slate-400">
                  Loading weekly schedule...
                </span>
              )}
            </div>
          </div>

          {/* Tab: Weekly */}
          {activeTab === "weekly" && (
            <>
              {!currentWeek && !loadingWeek && (
                <div className="rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/40 px-4 py-6 text-sm text-slate-400 text-center">
                  No weekly schedule for this week yet. Click{" "}
                  <span className="font-semibold text-emerald-300">
                    Generate
                  </span>{" "}
                  to create it from the Master schedule.
                </div>
              )}

              {currentWeek && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4 space-y-3">
                  {/* Header row: days */}
                  <div className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))] gap-3 text-xs text-slate-300 mb-2">
                    <div />
                    {Array.from({ length: 7 }).map((_, day) => {
                      const d = addDays(weekStart, day);
                      return (
                        <div key={day} className="text-center">
                          <div className="font-semibold text-slate-100">
                            {dayLabels[day]}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {formatDateShort(d)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Grid rows: Shift 1 / 2 / 3 ... */}
                  <div className="space-y-3">
                    {gridByDayAndSlot.maxSlots === 0 && (
                      <div className="text-xs text-slate-500 text-center py-4">
                        No shifts for this week. Use Master schedule to generate
                        schedule.
                      </div>
                    )}

                    {gridByDayAndSlot.slots.map((row, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))] gap-3"
                      >
                        <div className="flex items-start pt-2 text-xs text-slate-400">
                          Shift {rowIndex + 1}
                        </div>
                        {row.map((shift, dayIndex) => (
                          <div key={dayIndex}>
                            {renderShiftCell(shift && shift.id ? shift : null)}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="pt-3">
                    <button
                      type="button"
                      className="text-xs text-sky-300 hover:text-sky-100"
                      onClick={openCreateShiftModal}
                    >
                      + Add shift
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Tab: Summary & conflicts */}
          {activeTab === "summary" && currentWeek && (
            <div className="grid grid-cols-2 gap-4">
              {/* Summary by Service */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <h3 className="text-xs font-semibold text-slate-100 mb-3">
                  Units by Service
                </h3>
                {summaryByService.length === 0 ? (
                  <div className="text-xs text-slate-500">
                    No data for this week.
                  </div>
                ) : (
                  <table className="w-full text-[11px] text-left">
                    <thead className="text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-1 pr-2">Service</th>
                        <th className="py-1 pr-2 text-right">Scheduled (u)</th>
                        <th className="py-1 pr-2 text-right">Actual (u)</th>
                        <th className="py-1 text-right">Δ (u)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryByService.map((row) => {
                        const delta = row.visitedUnits - row.scheduledUnits;
                        return (
                          <tr key={row.service.id}>
                            <td className="py-1 pr-2">
                              <div className="font-medium text-slate-100">
                                {row.service.serviceCode}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {row.service.serviceName}
                              </div>
                            </td>
                            <td className="py-1 pr-2 text-right">
                              {row.scheduledUnits}
                            </td>
                            <td className="py-1 pr-2 text-right">
                              {row.visitedUnits}
                            </td>
                            <td
                              className={`py-1 text-right ${
                                delta > 0
                                  ? "text-emerald-300"
                                  : delta < 0
                                  ? "text-rose-300"
                                  : "text-slate-300"
                              }`}
                            >
                              {delta}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Conflicts */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <h3 className="text-xs font-semibold text-slate-100 mb-3">
                  Overlap / conflicts
                </h3>
                {conflicts.length === 0 ? (
                  <div className="text-xs text-emerald-300">
                    No conflicts detected for this week.
                  </div>
                ) : (
                  <div className="space-y-2 text-[11px]">
                    {conflicts.map((c, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-amber-500/60 bg-amber-950/40 px-3 py-2"
                      >
                        <div className="font-semibold text-amber-200 mb-1">
                          {c.dspName} — {dayLabels[c.dayIndex]}{" "}
                          {formatDateShort(c.date)}
                        </div>
                        {c.shifts.map((s) => (
                          <div key={s.id} className="text-slate-100">
                            {s.service.serviceCode} {formatTime(s.plannedStart)}
                            –{formatTime(s.plannedEnd)}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Payroll & ISP */}
          {activeTab === "payroll" && currentWeek && (
            <div className="grid grid-cols-2 gap-4">
              {/* Payroll by DSP */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <h3 className="text-xs font-semibold text-slate-100 mb-3">
                  Payroll – Units by DSP
                </h3>
                {summaryByDsp.length === 0 ? (
                  <div className="text-xs text-slate-500">
                    No DSP assigned for this week.
                  </div>
                ) : (
                  <table className="w-full text-[11px] text-left">
                    <thead className="text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-1 pr-2">DSP</th>
                        <th className="py-1 pr-2 text-right">
                          Scheduled (hrs)
                        </th>
                        <th className="py-1 pr-2 text-right">Actual (hrs)</th>
                        <th className="py-1 text-right">Δ (hrs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryByDsp.map((row) => {
                        const schedHours = row.scheduledUnits / 4;
                        const actualHours = row.visitedUnits / 4;
                        const delta = actualHours - schedHours;
                        return (
                          <tr key={row.dspId}>
                            <td className="py-1 pr-2">
                              <div className="font-medium text-slate-100">
                                {row.dspName}
                              </div>
                            </td>
                            <td className="py-1 pr-2 text-right">
                              {schedHours.toFixed(2)}
                            </td>
                            <td className="py-1 pr-2 text-right">
                              {actualHours.toFixed(2)}
                            </td>
                            <td
                              className={`py-1 text-right ${
                                delta > 0
                                  ? "text-emerald-300"
                                  : delta < 0
                                  ? "text-rose-300"
                                  : "text-slate-300"
                              }`}
                            >
                              {delta.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* ISP summary by Service */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <h3 className="text-xs font-semibold text-slate-100 mb-3">
                  ISP allocation – Actual units by Service
                </h3>
                {summaryByService.length === 0 ? (
                  <div className="text-xs text-slate-500">
                    No data for this week.
                  </div>
                ) : (
                  <table className="w-full text-[11px] text-left">
                    <thead className="text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-1 pr-2">Service</th>
                        <th className="py-1 pr-2 text-right">Actual (units)</th>
                        <th className="py-1 text-right">ISP Plan (units)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryByService.map((row) => (
                        <tr key={row.service.id}>
                          <td className="py-1 pr-2">
                            <div className="font-medium text-slate-100">
                              {row.service.serviceCode}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {row.service.serviceName}
                            </div>
                          </td>
                          <td className="py-1 pr-2 text-right">
                            {row.visitedUnits}
                          </td>
                          <td className="py-1 text-right text-slate-500">—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Modal edit weekly shift */}
      {editingShift && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-slate-700 px-4 py-4 text-sm text-slate-100 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">
                  Edit shift –{" "}
                  {
                    dayLabels[
                      currentWeek
                        ? Math.max(
                            0,
                            Math.min(
                              6,
                              getDayIndexInWeek(
                                currentWeek.weekStart,
                                editingShift.scheduleDate
                              )
                            )
                          )
                        : new Date(editingShift.scheduleDate).getDay()
                    ]
                  }{" "}
                  {formatDateShort(editingShift.scheduleDate)}
                </div>
                <div className="font-semibold text-slate-100">
                  {editingShift.service.serviceCode} –{" "}
                  {editingShift.service.serviceName}
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-slate-100"
                onClick={closeEditShift}
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-[11px] text-slate-300 mb-1">Service</div>
                <select
                  value={editShiftServiceId}
                  onChange={(e) => setEditShiftServiceId(e.target.value)}
                  className="h-8 w-full rounded-md bg-slate-900 border border-slate-700 px-2 text-xs"
                >
                  <option value={editingShift.service.id}>
                    {editingShift.service.serviceCode} —{" "}
                    {editingShift.service.serviceName}
                  </option>
                  {services
                    .filter((s) => s.id !== editingShift.service.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.serviceCode} — {s.serviceName}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <div className="text-[11px] text-slate-300 mb-1">DSP</div>
                <select
                  value={editShiftDspId}
                  onChange={(e) => setEditShiftDspId(e.target.value)}
                  className="h-8 w-full rounded-md bg-slate-900 border border-slate-700 px-2 text-xs"
                >
                  <option value="">— No DSP —</option>
                  {dsps.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.firstName} {d.lastName} ({d.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="text-[11px] text-slate-300 mb-1">
                    Schedule start
                  </div>
                  <input
                    type="time"
                    value={editShiftStart}
                    onChange={(e) => setEditShiftStart(e.target.value)}
                    className="h-8 w-full rounded-md bg-slate-900 border border-slate-700 px-2 text-xs"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-[11px] text-slate-300 mb-1">
                    Schedule end
                  </div>
                  <input
                    type="time"
                    value={editShiftEnd}
                    onChange={(e) => setEditShiftEnd(e.target.value)}
                    className="h-8 w-full rounded-md bg-slate-900 border border-slate-700 px-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-300 mb-1">Status</div>
                <select
                  value={editShiftStatus}
                  onChange={(e) => setEditShiftStatus(e.target.value)}
                  className="h-8 w-full rounded-md bg-slate-900 border border-slate-700 px-2 text-xs"
                >
                  {shiftStatusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[11px] text-slate-300 mb-1">Notes</div>
                <textarea
                  value={editShiftNotes}
                  onChange={(e) => setEditShiftNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs resize-none"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center gap-2">
              <button
                type="button"
                className="text-xs text-rose-300 hover:text-rose-200 disabled:opacity-50"
                onClick={handleDeleteShiftFromModal}
                disabled={editShiftSaving || editShiftDeleting}
              >
                {editShiftDeleting ? "Deleting..." : "Delete shift"}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs text-slate-400 hover:text-slate-100"
                  onClick={closeEditShift}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={editShiftSaving || editShiftDeleting}
                  onClick={handleSaveShiftEdit}
                  className="text-xs rounded-full bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {editShiftSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal edit master event */}
      {editingMasterShift && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-slate-700 px-4 py-4 text-sm text-slate-100 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">
                  Edit event – {dayLabels[editingMasterShift.dayOfWeek]}
                </div>
                <div className="font-semibold text-slate-100">
                  {editingMasterShift.service?.serviceCode ?? "Service"}
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-slate-100"
                onClick={closeEditMasterShift}
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-[11px] text-slate-300 mb-1">Service</div>
                <select
                  value={masterModalServiceId}
                  onChange={(e) => setMasterModalServiceId(e.target.value)}
                  className="h-8 w-full rounded-md bg-slate-900 border border-slate-700 px-2 text-xs"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.serviceCode} — {s.serviceName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[11px] text-slate-300 mb-1">DSP</div>
                <select
                  value={masterModalDspId}
                  onChange={(e) => setMasterModalDspId(e.target.value)}
                  className="h-8 w-full rounded-md bg-slate-900 border border-slate-700 px-2 text-xs"
                >
                  <option value="">— No default DSP —</option>
                  {dsps.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.firstName} {d.lastName} ({d.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="text-[11px] text-slate-300 mb-1">
                    Start time
                  </div>
                  <input
                    type="time"
                    value={masterModalStart}
                    onChange={(e) => setMasterModalStart(e.target.value)}
                    className="h-8 w-full rounded-md bg-slate-900 border border-slate-700 px-2 text-xs"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-[11px] text-slate-300 mb-1">
                    End time
                  </div>
                  <input
                    type="time"
                    value={masterModalEnd}
                    onChange={(e) => setMasterModalEnd(e.target.value)}
                    className="h-8 w-full rounded-md bg-slate-900 border border-slate-700 px-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-300 mb-1">Notes</div>
                <textarea
                  value={masterModalNotes}
                  onChange={(e) => setMasterModalNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs resize-none"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center gap-2">
              <button
                type="button"
                className="text-xs text-rose-300 hover:text-rose-200"
                onClick={handleDeleteMasterShiftFromModal}
              >
                Delete event
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs text-slate-400 hover:text-slate-100"
                  onClick={closeEditMasterShift}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={masterModalSaving}
                  onClick={handleApplyMasterShiftEdit}
                  className="text-xs rounded-full bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {masterModalSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Generate multi weeks */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-2xl bg-slate-950 border border-slate-700 px-4 py-4 text-sm text-slate-100 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-slate-100">
                Generate schedule
              </div>
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-slate-100"
                onClick={() => setShowGenerateModal(false)}
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-slate-300">
                Generate schedule starting from{" "}
                <span className="font-medium">{weekRangeLabel}</span> for how
                many consecutive weeks?
              </div>
              <div>
                <div className="text-[11px] text-slate-300 mb-1">
                  Number of weeks (1–4)
                </div>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={generateWeeksCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (Number.isNaN(val)) {
                      setGenerateWeeksCount(1);
                    } else {
                      setGenerateWeeksCount(Math.max(1, Math.min(4, val)));
                    }
                  }}
                  className="h-8 w-24 rounded-md bg-slate-900 border border-slate-700 px-2 text-xs"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-slate-100"
                onClick={() => setShowGenerateModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={generatingWeek}
                onClick={handleConfirmGenerateWeeks}
                className="text-xs rounded-full bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {generatingWeek ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Create new shift */}
      {showCreateShiftModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-slate-700 px-4 py-4 text-sm text-slate-100 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-slate-100">
                Create new shift
              </div>
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-slate-100"
                onClick={closeCreateShiftModal}
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-[11px] text-slate-300 mb-1">Day</div>
                <select
                  value={createShiftDayIndex}
                  onChange={(e) =>
                    setCreateShiftDayIndex(Number(e.target.value) || 0)
                  }
                  className="h-8 w-full rounded-md bg-slate-900 border border-slate-700 px-2 text-xs"
                >
                  {dayLabels.map((label, idx) => (
                    <option key={idx} value={idx}>
                      {label} – {formatDateShort(addDays(weekStart, idx))}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[11px] text-slate-300 mb-1">Service</div>
                <select
                  value={createShiftServiceId}
                  onChange={(e) => setCreateShiftServiceId(e.target.value)}
                  className="h-8 w-full rounded-md bg-slate-900 border border-slate-700 px-2 text-xs"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.serviceCode} — {s.serviceName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[11px] text-slate-300 mb-1">DSP</div>
                <select
                  value={createShiftDspId}
                  onChange={(e) => setCreateShiftDspId(e.target.value)}
                  className="h-8 w-full rounded-md bg-slate-900 border border-slate-700 px-2 text-xs"
                >
                  <option value="">— No DSP —</option>
                  {dsps.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.firstName} {d.lastName} ({d.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="text-[11px] text-slate-300 mb-1">
                    Schedule start
                  </div>
                  <input
                    type="time"
                    value={createShiftStart}
                    onChange={(e) => setCreateShiftStart(e.target.value)}
                    className="h-8 w-full rounded-md bg-slate-900 border border-slate-700 px-2 text-xs"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-[11px] text-slate-300 mb-1">
                    Schedule end
                  </div>
                  <input
                    type="time"
                    value={createShiftEnd}
                    onChange={(e) => setCreateShiftEnd(e.target.value)}
                    className="h-8 w-full rounded-md bg-slate-900 border border-slate-700 px-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-300 mb-1">Status</div>
                <select
                  value={createShiftStatus}
                  onChange={(e) => setCreateShiftStatus(e.target.value)}
                  className="h-8 w-full rounded-md bg-slate-900 border border-slate-700 px-2 text-xs"
                >
                  {shiftStatusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[11px] text-slate-300 mb-1">Notes</div>
                <textarea
                  value={createShiftNotes}
                  onChange={(e) => setCreateShiftNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-xs resize-none"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-slate-100"
                onClick={closeCreateShiftModal}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creatingShift}
                onClick={handleCreateShift}
                className="text-xs rounded-full bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {creatingShift ? "Creating..." : "Create shift"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
