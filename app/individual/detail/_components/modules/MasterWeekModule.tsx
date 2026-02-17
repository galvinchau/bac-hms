"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

// ===== Types (copied from Schedule page) =====

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

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type ActiveTab = "weekly" | "summary" | "payroll";

// ===== Helpers (copied) =====

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

/**
 * Display date using UTC fields to avoid off-by-1 day due to timezone.
 */
function formatDateShort(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
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
 * Compute day index 0..6 based on weekStart + scheduleDate (avoid timezone day drift).
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

// ===== Component =====

export default function MasterWeekModule({ individualId }: { individualId: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [dsps, setDsps] = useState<Employee[]>([]);

  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeekSunday(new Date())
  );

  const [masterTemplates, setMasterTemplates] = useState<MasterScheduleTemplate[]>(
    []
  );
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
  const [editShiftCheckIn, setEditShiftCheckIn] = useState<string>("");
  const [editShiftCheckOut, setEditShiftCheckOut] = useState<string>("");

  // Drag modal
  const [isDraggingEditModal, setIsDraggingEditModal] = useState(false);
  const [editModalOffset, setEditModalOffset] = useState<{ x: number; y: number }>(
    { x: 0, y: 0 }
  );
  const editModalDragStart = useRef<{
    mouseX: number;
    mouseY: number;
    originX: number;
    originY: number;
  } | null>(null);

  // Modal edit master event
  const [editingMasterShift, setEditingMasterShift] =
    useState<MasterTemplateShift | null>(null);
  const [masterModalServiceId, setMasterModalServiceId] = useState<string>("");
  const [masterModalDspId, setMasterModalDspId] = useState<string>("");
  const [masterModalStart, setMasterModalStart] = useState<string>("07:00");
  const [masterModalEnd, setMasterModalEnd] = useState<string>("14:00");
  const [masterModalNotes, setMasterModalNotes] = useState<string>("");
  const [masterModalSaving, setMasterModalSaving] = useState(false);

  // Modal generate range
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateToDate, setGenerateToDate] = useState<string>("");

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

  // ===== Load Services =====
  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch("/api/services", { cache: "no-store" });
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

  // ===== Load DSPs =====
  useEffect(() => {
    async function fetchDsps() {
      try {
        const res = await fetch("/api/employees?simple=true", { cache: "no-store" });
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

  // ===== Load Master templates when Individual changes =====
  useEffect(() => {
    if (!individualId) {
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
          `/api/schedule/master?individualId=${individualId}&activeOnly=true`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("Failed to load master templates");

        const data = (await res.json()) as MasterApiResponse;
        const arr = Array.isArray(data) ? data : [];
        setMasterTemplates(arr);

        const first = arr[0] ?? null;
        setSelectedTemplate(first);

        if (first) {
          setMasterDraft({ ...first, shifts: [...first.shifts] });
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
  }, [individualId]);

  // ===== Load Weekly schedule when Individual or weekStart changes =====
  useEffect(() => {
    if (!individualId) {
      setCurrentWeek(null);
      return;
    }

    async function fetchWeek() {
      setLoadingWeek(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/schedule/week?individualId=${individualId}&weekStart=${weekStart.toISOString()}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("Failed to load weekly schedule");
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
  }, [individualId, weekStart]);

  // ===== Generate helpers =====
  async function generateWeekAt(startDate: Date): Promise<ScheduleWeek | null> {
    if (!individualId) return null;

    const res = await fetch("/api/schedule/week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        individualId,
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
    if (!individualId || generatingWeek) return;
    const defaultEnd = addDays(currentWeek ? new Date(currentWeek.weekStart) : weekStart, 6);
    setGenerateToDate(defaultEnd.toISOString().slice(0, 10));
    setShowGenerateModal(true);
    setError(null);
    setSuccess(null);
  }

  async function handleConfirmGenerateWeeks() {
    if (!individualId) return;
    if (!generateToDate) {
      setError("Please select an end date.");
      return;
    }

    try {
      setGeneratingWeek(true);
      setError(null);
      setSuccess(null);

      const baseStart = currentWeek ? new Date(currentWeek.weekStart) : weekStart;
      const start = new Date(baseStart);
      start.setHours(0, 0, 0, 0);

      const end = new Date(`${generateToDate}T00:00:00`);
      end.setHours(0, 0, 0, 0);

      if (end.getTime() < start.getTime()) {
        setError("End date must be on or after the current week start.");
        setGeneratingWeek(false);
        return;
      }

      const diffDays = Math.floor(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      const weeksCount = Math.floor(diffDays / 7) + 1;

      let firstWeek: ScheduleWeek | null = null;

      for (let i = 0; i < weeksCount; i++) {
        const targetStart = addDays(start, i * 7);
        const generated = await generateWeekAt(targetStart);
        if (i === 0 && generated) firstWeek = generated;
      }

      if (firstWeek) setCurrentWeek(firstWeek);

      setShowGenerateModal(false);
      setSuccess(
        weeksCount === 1
          ? "Weekly schedule generated successfully."
          : `Weekly schedules generated up to ${formatDateShort(end)}.`
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
    const base = currentWeek ? new Date(currentWeek.weekStart) : weekStart;
    const start = base;
    const end = addDays(base, 6);
    return `${formatDateShort(start)} – ${formatDateShort(end)}`;
  }, [weekStart, currentWeek]);

  // ===== Weekly grid =====
  const gridByDayAndSlot = useMemo(() => {
    if (!currentWeek) return { maxSlots: 0, slots: [] as ScheduleShift[][] };

    const byDay: ScheduleShift[][] = Array.from({ length: 7 }, () => []);

    for (const shift of currentWeek.shifts) {
      const dayIndex = getDayIndexInWeek(currentWeek.weekStart, shift.scheduleDate);
      if (dayIndex >= 0 && dayIndex <= 6) byDay[dayIndex].push(shift);
    }

    const maxSlots = byDay.reduce((max, arr) => {
      arr.sort(
        (a, b) =>
          new Date(a.plannedStart).getTime() - new Date(b.plannedStart).getTime()
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

  // drag handlers
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!editModalDragStart.current) return;
      const { mouseX, mouseY, originX, originY } = editModalDragStart.current;
      const dx = e.clientX - mouseX;
      const dy = e.clientY - mouseY;
      setEditModalOffset({ x: originX + dx, y: originY + dy });
    }

    function handleMouseUp() {
      editModalDragStart.current = null;
      setIsDraggingEditModal(false);
    }

    if (isDraggingEditModal) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingEditModal]);

  function handleEditModalHeaderMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    editModalDragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      originX: editModalOffset.x,
      originY: editModalOffset.y,
    };
    setIsDraggingEditModal(true);
  }

  // ===== Master editing =====
  function ensureDraftBase(): MasterScheduleTemplate | null {
    if (!individualId) return null;
    if (masterDraft) return masterDraft;

    const nowIso = new Date().toISOString();
    const base: MasterScheduleTemplate = {
      id: selectedTemplate?.id ?? "draft",
      individualId,
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
    if (!individualId) return;
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

    setMasterDraft({ ...base, shifts: [...base.shifts, newShift] });
    setEditingDay(null);
  }

  function openEditMasterShift(shift: MasterTemplateShift) {
    setEditingMasterShift(shift);
    setMasterModalServiceId(shift.serviceId);
    setMasterModalDspId(shift.defaultDsp?.id ?? "");
    setMasterModalStart(() => {
      const h = Math.floor(shift.startMinutes / 60).toString().padStart(2, "0");
      const m = (shift.startMinutes % 60).toString().padStart(2, "0");
      return `${h}:${m}`;
    });
    setMasterModalEnd(() => {
      const h = Math.floor(shift.endMinutes / 60).toString().padStart(2, "0");
      const m = (shift.endMinutes % 60).toString().padStart(2, "0");
      return `${h}:${m}`;
    });
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

    setMasterDraft({ ...masterDraft, shifts: updatedShifts });
    closeEditMasterShift();
  }

  async function handleSaveMasterTemplate() {
    if (!individualId) return;
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
        res = await fetch(`/api/schedule/master/${selectedTemplate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selectedTemplate.id, ...payload }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "FAILED_TO_UPDATE_MASTER");
        }
        savedTemplate = (await res.json()) as MasterScheduleTemplate;
      } else {
        res = await fetch("/api/schedule/master", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ individualId, ...payload }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "FAILED_TO_CREATE_MASTER");
        }
        savedTemplate = (await res.json()) as MasterScheduleTemplate;
      }

      setSelectedTemplate(savedTemplate);
      setMasterTemplates([savedTemplate]);
      setMasterDraft({ ...savedTemplate, shifts: [...savedTemplate.shifts] });
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
      setMasterDraft({ ...selectedTemplate, shifts: [...selectedTemplate.shifts] });
    } else {
      setMasterDraft(null);
    }
    setEditingDay(null);
  }

  // ===== Summary / conflicts =====
  const summaryByService = useMemo(() => {
    if (!currentWeek) return [] as { service: Service; scheduledUnits: number; visitedUnits: number }[];

    const map = new Map<string, { service: Service; scheduledUnits: number; visitedUnits: number }>();

    for (const s of currentWeek.shifts) {
      const key = s.service.id;
      if (!map.has(key)) {
        map.set(key, { service: s.service, scheduledUnits: 0, visitedUnits: 0 });
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
    if (!currentWeek) return [] as { dspId: string; dspName: string; scheduledUnits: number; visitedUnits: number }[];

    const map = new Map<string, { dspId: string; dspName: string; scheduledUnits: number; visitedUnits: number }>();

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

    return Array.from(map.values()).sort((a, b) => a.dspName.localeCompare(b.dspName));
  }, [currentWeek]);

  const conflicts = useMemo(() => {
    if (!currentWeek) return [] as { dspName: string; date: string; dayIndex: number; shifts: ScheduleShift[] }[];

    const result: { dspName: string; date: string; dayIndex: number; shifts: ScheduleShift[] }[] = [];
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
          new Date(a.plannedStart).getTime() - new Date(b.plannedStart).getTime()
      );
      for (let i = 0; i < arr.length - 1; i++) {
        const current = arr[i];
        const next = arr[i + 1];
        if (new Date(current.plannedEnd).getTime() > new Date(next.plannedStart).getTime()) {
          const [, dayStr] = key.split("-");
          const dsp = (current.actualDsp ?? current.plannedDsp)!;
          const baseWeek = new Date(currentWeek.weekStart);
          const displayDate = addDays(baseWeek, Number(dayStr));
          result.push({
            dspName: `${dsp.firstName} ${dsp.lastName}`,
            date: displayDate.toISOString(),
            dayIndex: Number(dayStr),
            shifts: [current, next],
          });
        }
      }
    }

    return result;
  }, [currentWeek]);

  // ===== Weekly shift edit =====
  function openEditShift(shift: ScheduleShift) {
    setEditingShift(shift);
    setEditShiftServiceId(shift.service.id);
    setEditShiftDspId(shift.actualDsp?.id ?? shift.plannedDsp?.id ?? "");
    setEditShiftStart(formatTime(shift.plannedStart));
    setEditShiftEnd(formatTime(shift.plannedEnd));
    setEditShiftStatus(shift.status);
    setEditShiftNotes(shift.notes ?? "");

    const firstVisit = shift.visits[0];
    setEditShiftCheckIn(firstVisit ? formatTime(firstVisit.checkInAt) : "");
    setEditShiftCheckOut(firstVisit && firstVisit.checkOutAt ? formatTime(firstVisit.checkOutAt) : "");
  }

  function closeEditShift() {
    setEditingShift(null);
    setEditShiftSaving(false);
    setEditShiftDeleting(false);
    setEditShiftCheckIn("");
    setEditShiftCheckOut("");
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
    const endBase = endMinutes >= startMinutes ? baseDate : addDays(baseDate, 1);
    const plannedEndIso = makeDate(endBase, endMinutes);

    let visitCheckInIso: string | null = null;
    let visitCheckOutIso: string | null = null;
    let ciMinutes: number | null = null;
    let coMinutes: number | null = null;

    if (editShiftCheckIn.trim()) {
      ciMinutes = parseTimeToMinutes(editShiftCheckIn);
      if (ciMinutes === null) {
        setError("Check in time is not valid. Use HH:MM format (e.g. 07:00).");
        return;
      }
      visitCheckInIso = makeDate(baseDate, ciMinutes);
    }

    if (editShiftCheckOut.trim()) {
      coMinutes = parseTimeToMinutes(editShiftCheckOut);
      if (coMinutes === null) {
        setError("Check out time is not valid. Use HH:MM format (e.g. 14:30).");
        return;
      }
      const visitEndBase =
        ciMinutes !== null && coMinutes < ciMinutes ? addDays(baseDate, 1) : baseDate;
      visitCheckOutIso = makeDate(visitEndBase, coMinutes);
    }

    try {
      setEditShiftSaving(true);
      setError(null);
      setSuccess(null);

      const payload: any = {
        shiftId: editingShift.id,
        serviceId: editShiftServiceId || editingShift.service.id,
        plannedStart: plannedStartIso,
        plannedEnd: plannedEndIso,
        status: editShiftStatus,
        notes: editShiftNotes || null,
        dspId: editShiftDspId || null,
      };

      if (visitCheckInIso) payload.checkInAt = visitCheckInIso;
      if (visitCheckOutIso) payload.checkOutAt = visitCheckOutIso;

      const res = await fetch(`/api/schedule/shift/${editingShift.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to update shift (${res.status})`);
      }

      const updated = (await res.json()) as ScheduleShift;

      setCurrentWeek((prev) =>
        prev
          ? { ...prev, shifts: prev.shifts.map((s) => (s.id === updated.id ? updated : s)) }
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

    const confirmed = window.confirm("Are you sure you want to delete this shift?");
    if (!confirmed) return;

    try {
      setEditShiftDeleting(true);
      setError(null);
      setSuccess(null);

      const res = await fetch(`/api/schedule/shift`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId: editingShift.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to delete shift (${res.status})`);
      }

      setCurrentWeek((prev) =>
        prev ? { ...prev, shifts: prev.shifts.filter((s) => s.id !== editingShift.id) } : prev
      );

      setSuccess("Shift deleted successfully.");
      closeEditShift();
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Failed to delete shift");
      setEditShiftDeleting(false);
    }
  }

  // ===== Create shift =====
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
    if (!currentWeek || !individualId) return;

    const startMinutes = parseTimeToMinutes(createShiftStart);
    const endMinutes = parseTimeToMinutes(createShiftEnd);

    if (startMinutes === null || endMinutes === null) {
      setError("Time is not valid. Use HH:MM format (e.g. 07:00).");
      return;
    }

    const baseWeekStart = currentWeek ? new Date(currentWeek.weekStart) : weekStart;
    const baseDate = addDays(baseWeekStart, createShiftDayIndex);
    baseDate.setHours(0, 0, 0, 0);
    const scheduleDateIso = baseDate.toISOString();

    const makeDate = (base: Date, minutes: number) => {
      const d = new Date(base);
      d.setMinutes(minutes);
      return d.toISOString();
    };

    const plannedStartIso = makeDate(baseDate, startMinutes);
    const endBase = endMinutes >= startMinutes ? baseDate : addDays(baseDate, 1);
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
          individualId,
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

      setCurrentWeek((prev) => (prev ? { ...prev, shifts: [...prev.shifts, created] } : prev));

      setSuccess("Shift created successfully.");
      setShowCreateShiftModal(false);
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Failed to create shift");
    } finally {
      setCreatingShift(false);
    }
  }

  // ===== Render helpers =====
  function renderMasterDayCard(dayIndex: number) {
    const shifts =
      masterDraft?.shifts
        .filter((s) => s.dayOfWeek === dayIndex)
        .sort((a, b) => a.startMinutes - b.startMinutes) ?? [];

    const isEditingThisDay = editingDay === dayIndex;

    return (
      <div className="h-full flex flex-col rounded-2xl border border-bac-border bg-bac-panel/30 px-4 py-3 text-sm text-bac-text">
        <div className="font-semibold text-bac-text flex items-center justify-between mb-2">
          <span>{dayLabels[dayIndex]}</span>
        </div>

        {shifts.length === 0 && !isEditingThisDay && (
          <div className="text-xs italic text-bac-muted flex-1 flex items-center">
            No master template
          </div>
        )}

        <div className="space-y-2">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="rounded-xl border border-bac-border bg-bac-panel/40 px-3 py-2 text-xs"
            >
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-bac-green">
                  {shift.service?.serviceCode || "SVC"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-bac-green/10 px-2 py-[2px] text-[10px] font-medium text-bac-green">
                  <span className="h-1.5 w-1.5 rounded-full bg-bac-green" />
                  Active
                </span>
              </div>
              <div className="text-bac-muted mb-1">
                {formatMinutesRange(shift.startMinutes, shift.endMinutes)}
              </div>
              {shift.defaultDsp && (
                <div className="text-[11px] text-bac-muted mb-1">
                  DSP: {shift.defaultDsp.firstName} {shift.defaultDsp.lastName}
                </div>
              )}
              <button
                type="button"
                className="mt-1 text-[11px] text-bac-primary hover:opacity-90"
                onClick={() => openEditMasterShift(shift)}
              >
                Edit event
              </button>
            </div>
          ))}

          {isEditingThisDay && (
            <div className="rounded-xl border border-dashed border-bac-border bg-bac-panel/40 px-3 py-2 text-xs space-y-2">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-bac-muted">Service</span>
                <select
                  value={editServiceId}
                  onChange={(e) => setEditServiceId(e.target.value)}
                  className="h-7 rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
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
                  <span className="text-[11px] text-bac-muted">Start</span>
                  <input
                    type="time"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="h-7 rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-[11px] text-bac-muted">End</span>
                  <input
                    type="time"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="h-7 rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="text-[11px] text-bac-muted hover:opacity-90"
                  onClick={handleCancelAddShift}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="text-[11px] rounded-full bg-bac-green px-3 py-1 font-semibold text-black hover:opacity-90"
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
              disabled={!individualId}
              onClick={() => handleStartAddShift(dayIndex)}
              className="text-[11px] text-bac-primary hover:opacity-90 disabled:opacity-40"
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
        <div className="h-full rounded-2xl border border-dashed border-bac-border bg-bac-panel/20 flex items-center justify-center text-xs text-bac-muted">
          No shift
        </div>
      );
    }

    const scheduledUnits = calcScheduledUnits(shift);
    const visitedUnits = calcVisitedUnits(shift);
    const deltaUnits = visitedUnits - scheduledUnits;

    const dsp = shift.actualDsp ?? shift.plannedDsp ?? (null as unknown as Employee);

    const statusColor =
      shift.status === "COMPLETED"
        ? "text-bac-green"
        : shift.status === "IN_PROGRESS"
          ? "text-yellow-300"
          : shift.status === "CANCELLED"
            ? "text-bac-red"
            : shift.status === "BACKUP_PLAN"
              ? "text-bac-primary"
              : "text-bac-muted";

    return (
      <div className="h-full rounded-2xl border border-bac-border bg-bac-panel/30 px-3 py-2 text-xs text-bac-text flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <div className="font-semibold text-bac-green">{shift.service.serviceCode}</div>
          <div className={`text-[10px] uppercase tracking-wide ${statusColor}`}>
            {shift.status.replace("_", " ")}
          </div>
        </div>

        {dsp && (
          <div className="text-[11px] text-bac-muted mb-1">
            {dsp.firstName} {dsp.lastName}
          </div>
        )}

        <div className="flex justify-between text-[11px] text-bac-muted mb-1">
          <span className="whitespace-nowrap">
            Sched: {formatTime(shift.plannedStart)}–{formatTime(shift.plannedEnd)}
          </span>
          <span>{scheduledUnits}u</span>
        </div>

        <div className="flex justify-between text-[11px] text-bac-muted mb-1">
          <span className="whitespace-nowrap">
            Visit:{" "}
            {shift.visits.length > 0
              ? `${formatTime(shift.visits[0].checkInAt)}–${
                  shift.visits[0].checkOutAt ? formatTime(shift.visits[0].checkOutAt) : "--:--"
                }`
              : "--:-- – --:--"}
          </span>
          <span>{visitedUnits}u</span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-1 border-t border-bac-border text-[11px] text-bac-muted">
          <span>Δ {deltaUnits}u</span>
          <button
            type="button"
            className="text-[11px] underline decoration-dotted hover:text-bac-primary"
            onClick={() => openEditShift(shift)}
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  // ===== UI =====
  return (
    <div className="w-full max-w-none space-y-4">
      {/* Top actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bac-border bg-bac-panel/20 p-4">
        <div>
          <div className="text-lg font-semibold text-bac-text">Master Week</div>
          <div className="text-sm text-bac-muted">
            Master schedule template + weekly generated shifts (per Individual).
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1 items-end">
            <span className="text-xs text-bac-muted">Generate schedule</span>
            <button
              type="button"
              onClick={handleGenerateWeek}
              disabled={!individualId || generatingWeek}
              className="inline-flex items-center gap-2 rounded-full bg-bac-green px-4 py-2 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-50"
            >
              {generatingWeek ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-bac-red bg-bac-red/10 px-4 py-2 text-sm text-bac-red">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-bac-green bg-bac-green/10 px-4 py-2 text-sm text-bac-green">
          {success}
        </div>
      )}

      {/* Master Schedule */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-bac-text">
            Master Schedule (Sunday–Saturday)
          </h2>
          <div className="flex items-center gap-3">
            {loadingMaster && (
              <span className="text-[11px] text-bac-muted">Loading master schedule...</span>
            )}
            <button
              type="button"
              onClick={handleResetMasterDraft}
              className="text-[11px] text-bac-muted hover:opacity-90"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSaveMasterTemplate}
              disabled={savingMaster || !individualId}
              className="inline-flex items-center gap-2 rounded-full bg-bac-primary px-4 py-2 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-50"
            >
              {savingMaster ? "Saving..." : "Save Master schedule"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1100px] grid grid-cols-7 gap-3">
            {dayLabels.map((_, idx) => (
              <div key={idx}>{renderMasterDayCard(idx)}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Weekly + tabs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h2 className="text-sm font-semibold text-bac-text">
              Weekly schedule (Sunday–Saturday)
            </h2>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-bac-muted">Week</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevWeek}
                  className="h-8 rounded-full border border-bac-border px-3 text-xs hover:bg-bac-panel/40"
                >
                  Prev
                </button>
                <span className="text-sm font-medium text-bac-text">{weekRangeLabel}</span>
                <button
                  type="button"
                  onClick={handleNextWeek}
                  className="h-8 rounded-full border border-bac-border px-3 text-xs hover:bg-bac-panel/40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-bac-border bg-bac-panel/30 px-1 py-1 text-sm font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("weekly")}
                className={`px-3 py-1 rounded-full ${
                  activeTab === "weekly"
                    ? "bg-white text-black"
                    : "text-bac-text hover:opacity-90"
                }`}
              >
                Weekly detail
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("summary")}
                className={`px-3 py-1 rounded-full ${
                  activeTab === "summary"
                    ? "bg-white text-black"
                    : "text-bac-text hover:opacity-90"
                }`}
              >
                Summary & conflicts
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("payroll")}
                className={`px-3 py-1 rounded-full ${
                  activeTab === "payroll"
                    ? "bg-white text-black"
                    : "text-bac-text hover:opacity-90"
                }`}
              >
                Payroll & ISP
              </button>
            </div>

            {loadingWeek && (
              <span className="text-[11px] text-bac-muted">Loading weekly schedule...</span>
            )}
          </div>
        </div>

        {/* Weekly */}
        {activeTab === "weekly" && (
          <>
            {!currentWeek && !loadingWeek && (
              <div className="rounded-2xl border border-dashed border-bac-border bg-bac-panel/20 px-4 py-6 text-sm text-bac-muted text-center">
                No weekly schedule for this week yet. Click{" "}
                <span className="font-semibold text-bac-green">Generate</span>{" "}
                to create it from the Master schedule.
              </div>
            )}

            {currentWeek && (
              <div className="rounded-2xl border border-bac-border bg-bac-panel/20 px-4 py-4 space-y-3">
                <div className="overflow-x-auto">
                  <div className="min-w-[1100px] space-y-3">
                    <div className="grid grid-cols-7 gap-3 text-xs text-bac-muted mb-2">
                      {Array.from({ length: 7 }).map((_, day) => {
                        const d = addDays(weekStart, day);
                        return (
                          <div key={day} className="text-center">
                            <div className="font-semibold text-bac-text">
                              {dayLabels[day]}
                            </div>
                            <div className="text-[11px] text-bac-muted">
                              {formatDateShort(d)}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-3">
                      {gridByDayAndSlot.maxSlots === 0 && (
                        <div className="text-xs text-bac-muted text-center py-4">
                          No shifts for this week. Use Master schedule to generate schedule.
                        </div>
                      )}

                      {gridByDayAndSlot.slots.map((row, rowIndex) => (
                        <div key={rowIndex} className="grid grid-cols-7 gap-3">
                          {row.map((shift, dayIndex) => (
                            <div key={dayIndex}>
                              {renderShiftCell(shift && shift.id ? shift : null)}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="button"
                    className="text-xs text-bac-primary hover:opacity-90"
                    onClick={openCreateShiftModal}
                  >
                    + Add shift
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Summary */}
        {activeTab === "summary" && currentWeek && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-bac-border bg-bac-panel/20 p-4">
              <h3 className="text-xs font-semibold text-bac-text mb-3">
                Units by Service
              </h3>
              {summaryByService.length === 0 ? (
                <div className="text-xs text-bac-muted">No data for this week.</div>
              ) : (
                <table className="w-full text-[11px] text-left">
                  <thead className="text-bac-muted border-b border-bac-border">
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
                            <div className="font-medium text-bac-text">
                              {row.service.serviceCode}
                            </div>
                            <div className="text-[10px] text-bac-muted">
                              {row.service.serviceName}
                            </div>
                          </td>
                          <td className="py-1 pr-2 text-right">{row.scheduledUnits}</td>
                          <td className="py-1 pr-2 text-right">{row.visitedUnits}</td>
                          <td
                            className={`py-1 text-right ${
                              delta > 0
                                ? "text-bac-green"
                                : delta < 0
                                  ? "text-bac-red"
                                  : "text-bac-text"
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

            <div className="rounded-2xl border border-bac-border bg-bac-panel/20 p-4">
              <h3 className="text-xs font-semibold text-bac-text mb-3">
                Overlap / conflicts
              </h3>
              {conflicts.length === 0 ? (
                <div className="text-xs text-bac-green">
                  No conflicts detected for this week.
                </div>
              ) : (
                <div className="space-y-2 text-[11px]">
                  {conflicts.map((c, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-yellow-400/60 bg-yellow-400/10 px-3 py-2"
                    >
                      <div className="font-semibold text-yellow-300 mb-1">
                        {c.dspName} — {dayLabels[c.dayIndex]} {formatDateShort(c.date)}
                      </div>
                      {c.shifts.map((s) => (
                        <div key={s.id} className="text-bac-text">
                          {s.service.serviceCode} {formatTime(s.plannedStart)}–{formatTime(s.plannedEnd)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payroll/ISP */}
        {activeTab === "payroll" && currentWeek && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-bac-border bg-bac-panel/20 p-4">
              <h3 className="text-xs font-semibold text-bac-text mb-3">
                Payroll – Units by DSP
              </h3>
              {summaryByDsp.length === 0 ? (
                <div className="text-xs text-bac-muted">No DSP assigned for this week.</div>
              ) : (
                <table className="w-full text-[11px] text-left">
                  <thead className="text-bac-muted border-b border-bac-border">
                    <tr>
                      <th className="py-1 pr-2">DSP</th>
                      <th className="py-1 pr-2 text-right">Scheduled (hrs)</th>
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
                            <div className="font-medium text-bac-text">{row.dspName}</div>
                          </td>
                          <td className="py-1 pr-2 text-right">{schedHours.toFixed(2)}</td>
                          <td className="py-1 pr-2 text-right">{actualHours.toFixed(2)}</td>
                          <td
                            className={`py-1 text-right ${
                              delta > 0
                                ? "text-bac-green"
                                : delta < 0
                                  ? "text-bac-red"
                                  : "text-bac-text"
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

            <div className="rounded-2xl border border-bac-border bg-bac-panel/20 p-4">
              <h3 className="text-xs font-semibold text-bac-text mb-3">
                ISP allocation – Actual units by Service
              </h3>
              {summaryByService.length === 0 ? (
                <div className="text-xs text-bac-muted">No data for this week.</div>
              ) : (
                <table className="w-full text-[11px] text-left">
                  <thead className="text-bac-muted border-b border-bac-border">
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
                          <div className="font-medium text-bac-text">
                            {row.service.serviceCode}
                          </div>
                          <div className="text-[10px] text-bac-muted">
                            {row.service.serviceName}
                          </div>
                        </td>
                        <td className="py-1 pr-2 text-right">{row.visitedUnits}</td>
                        <td className="py-1 text-right text-bac-muted">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ===== Modals: edit weekly shift ===== */}
      {editingShift && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div
            className="w-full max-w-md rounded-2xl bg-bac-panel border border-bac-border px-4 py-4 text-sm text-bac-text shadow-xl"
            style={{
              transform: `translate(${editModalOffset.x}px, ${editModalOffset.y}px)`,
              cursor: isDraggingEditModal ? "grabbing" : "default",
            }}
          >
            <div
              className="flex items-center justify-between mb-3 cursor-move select-none"
              onMouseDown={handleEditModalHeaderMouseDown}
            >
              <div>
                <div className="text-xs text-bac-muted mb-1">Edit shift</div>
                <div className="font-semibold text-bac-text">
                  {editingShift.service.serviceCode} – {editingShift.service.serviceName}
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-bac-muted hover:opacity-90"
                onClick={closeEditShift}
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-[11px] text-bac-muted mb-1">Service</div>
                <select
                  value={editShiftServiceId}
                  onChange={(e) => setEditShiftServiceId(e.target.value)}
                  className="h-8 w-full rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
                >
                  <option value={editingShift.service.id}>
                    {editingShift.service.serviceCode} — {editingShift.service.serviceName}
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
                <div className="text-[11px] text-bac-muted mb-1">DSP</div>
                <select
                  value={editShiftDspId}
                  onChange={(e) => setEditShiftDspId(e.target.value)}
                  className="h-8 w-full rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
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
                  <div className="text-[11px] text-bac-muted mb-1">Schedule start</div>
                  <input
                    type="time"
                    value={editShiftStart}
                    onChange={(e) => setEditShiftStart(e.target.value)}
                    className="h-8 w-full rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-[11px] text-bac-muted mb-1">Schedule end</div>
                  <input
                    type="time"
                    value={editShiftEnd}
                    onChange={(e) => setEditShiftEnd(e.target.value)}
                    className="h-8 w-full rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="text-[11px] text-bac-muted mb-1">Check in</div>
                  <input
                    type="time"
                    value={editShiftCheckIn}
                    onChange={(e) => setEditShiftCheckIn(e.target.value)}
                    className="h-8 w-full rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-[11px] text-bac-muted mb-1">Check out</div>
                  <input
                    type="time"
                    value={editShiftCheckOut}
                    onChange={(e) => setEditShiftCheckOut(e.target.value)}
                    className="h-8 w-full rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
                  />
                </div>
              </div>

              <div>
                <div className="text-[11px] text-bac-muted mb-1">Status</div>
                <select
                  value={editShiftStatus}
                  onChange={(e) => setEditShiftStatus(e.target.value)}
                  className="h-8 w-full rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
                >
                  {shiftStatusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[11px] text-bac-muted mb-1">Notes</div>
                <textarea
                  value={editShiftNotes}
                  onChange={(e) => setEditShiftNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md bg-bac-panel border border-bac-border px-2 py-1 text-xs text-bac-text resize-none"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center gap-2">
              <button
                type="button"
                className="text-xs text-bac-red hover:opacity-90 disabled:opacity-50"
                onClick={handleDeleteShiftFromModal}
                disabled={editShiftSaving || editShiftDeleting}
              >
                {editShiftDeleting ? "Deleting..." : "Delete shift"}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs text-bac-muted hover:opacity-90"
                  onClick={closeEditShift}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={editShiftSaving || editShiftDeleting}
                  onClick={handleSaveShiftEdit}
                  className="text-xs rounded-full bg-bac-green px-4 py-2 font-semibold text-black hover:opacity-90 disabled:opacity-50"
                >
                  {editShiftSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal edit master event ===== */}
      {editingMasterShift && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-bac-panel border border-bac-border px-4 py-4 text-sm text-bac-text shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-bac-muted mb-1">
                  Edit event – {dayLabels[editingMasterShift.dayOfWeek]}
                </div>
                <div className="font-semibold text-bac-text">
                  {editingMasterShift.service?.serviceCode ?? "Service"}
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-bac-muted hover:opacity-90"
                onClick={closeEditMasterShift}
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-[11px] text-bac-muted mb-1">Service</div>
                <select
                  value={masterModalServiceId}
                  onChange={(e) => setMasterModalServiceId(e.target.value)}
                  className="h-8 w-full rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.serviceCode} — {s.serviceName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[11px] text-bac-muted mb-1">DSP</div>
                <select
                  value={masterModalDspId}
                  onChange={(e) => setMasterModalDspId(e.target.value)}
                  className="h-8 w-full rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
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
                  <div className="text-[11px] text-bac-muted mb-1">Start time</div>
                  <input
                    type="time"
                    value={masterModalStart}
                    onChange={(e) => setMasterModalStart(e.target.value)}
                    className="h-8 w-full rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-[11px] text-bac-muted mb-1">End time</div>
                  <input
                    type="time"
                    value={masterModalEnd}
                    onChange={(e) => setMasterModalEnd(e.target.value)}
                    className="h-8 w-full rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
                  />
                </div>
              </div>

              <div>
                <div className="text-[11px] text-bac-muted mb-1">Notes</div>
                <textarea
                  value={masterModalNotes}
                  onChange={(e) => setMasterModalNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md bg-bac-panel border border-bac-border px-2 py-1 text-xs text-bac-text resize-none"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center gap-2">
              <button
                type="button"
                className="text-xs text-bac-red hover:opacity-90"
                onClick={handleDeleteMasterShiftFromModal}
              >
                Delete event
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs text-bac-muted hover:opacity-90"
                  onClick={closeEditMasterShift}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={masterModalSaving}
                  onClick={handleApplyMasterShiftEdit}
                  className="text-xs rounded-full bg-bac-green px-4 py-2 font-semibold text-black hover:opacity-90 disabled:opacity-50"
                >
                  {masterModalSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal generate range ===== */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-2xl bg-bac-panel border border-bac-border px-4 py-4 text-sm text-bac-text shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-bac-text">Generate schedule</div>
              <button
                type="button"
                className="text-xs text-bac-muted hover:opacity-90"
                onClick={() => setShowGenerateModal(false)}
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-bac-muted">
                Generate schedule starting from{" "}
                <span className="font-medium text-bac-text">{weekRangeLabel}</span>{" "}
                until the selected end date.
              </div>
              <div>
                <div className="text-[11px] text-bac-muted mb-1">End date</div>
                <input
                  type="date"
                  value={generateToDate}
                  onChange={(e) => setGenerateToDate(e.target.value)}
                  className="h-8 w-full rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="text-xs text-bac-muted hover:opacity-90"
                onClick={() => setShowGenerateModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={generatingWeek}
                onClick={handleConfirmGenerateWeeks}
                className="text-xs rounded-full bg-bac-green px-4 py-2 font-semibold text-black hover:opacity-90 disabled:opacity-50"
              >
                {generatingWeek ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal create new shift ===== */}
      {showCreateShiftModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-bac-panel border border-bac-border px-4 py-4 text-sm text-bac-text shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-bac-text">Create new shift</div>
              <button
                type="button"
                className="text-xs text-bac-muted hover:opacity-90"
                onClick={closeCreateShiftModal}
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-[11px] text-bac-muted mb-1">Day</div>
                <select
                  value={createShiftDayIndex}
                  onChange={(e) => setCreateShiftDayIndex(Number(e.target.value) || 0)}
                  className="h-8 w-full rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
                >
                  {dayLabels.map((label, idx) => {
                    const base =
                      currentWeek && currentWeek.weekStart
                        ? new Date(currentWeek.weekStart)
                        : weekStart;
                    const d = addDays(base, idx);
                    return (
                      <option key={idx} value={idx}>
                        {label} – {formatDateShort(d)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <div className="text-[11px] text-bac-muted mb-1">Service</div>
                <select
                  value={createShiftServiceId}
                  onChange={(e) => setCreateShiftServiceId(e.target.value)}
                  className="h-8 w-full rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.serviceCode} — {s.serviceName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[11px] text-bac-muted mb-1">DSP</div>
                <select
                  value={createShiftDspId}
                  onChange={(e) => setCreateShiftDspId(e.target.value)}
                  className="h-8 w-full rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
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
                  <div className="text-[11px] text-bac-muted mb-1">Schedule start</div>
                  <input
                    type="time"
                    value={createShiftStart}
                    onChange={(e) => setCreateShiftStart(e.target.value)}
                    className="h-8 w-full rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-[11px] text-bac-muted mb-1">Schedule end</div>
                  <input
                    type="time"
                    value={createShiftEnd}
                    onChange={(e) => setCreateShiftEnd(e.target.value)}
                    className="h-8 w-full rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
                  />
                </div>
              </div>

              <div>
                <div className="text-[11px] text-bac-muted mb-1">Status</div>
                <select
                  value={createShiftStatus}
                  onChange={(e) => setCreateShiftStatus(e.target.value)}
                  className="h-8 w-full rounded-md bg-bac-panel border border-bac-border px-2 text-xs text-bac-text"
                >
                  {shiftStatusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[11px] text-bac-muted mb-1">Notes</div>
                <textarea
                  value={createShiftNotes}
                  onChange={(e) => setCreateShiftNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md bg-bac-panel border border-bac-border px-2 py-1 text-xs text-bac-text resize-none"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="text-xs text-bac-muted hover:opacity-90"
                onClick={closeCreateShiftModal}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creatingShift}
                onClick={handleCreateShift}
                className="text-xs rounded-full bg-bac-green px-4 py-2 font-semibold text-black hover:opacity-90 disabled:opacity-50"
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
