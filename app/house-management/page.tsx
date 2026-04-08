// bac-hms/web/app/house-management/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import HouseTabs from "@/components/house-management/HouseTabs";
import {
  Badge,
  FormField,
  HouseTabKey,
  Modal,
  Select,
} from "@/components/house-management/shared";
import {
  DEMO_APPOINTMENTS,
  DEMO_CHORES,
  DEMO_COMPLIANCE,
  DEMO_DRILLS,
  DEMO_MEALS,
  DEMO_MEDS,
  DEMO_SPECIALISTS,
} from "@/components/house-management/demo-data";

import HousesTab from "@/components/house-management/tabs/HousesTab";
import DashboardTab from "@/components/house-management/tabs/DashboardTab";
import ResidentsTab, {
  AvailableIndividualOption,
  ResidentialProfilePayload,
} from "@/components/house-management/tabs/ResidentsTab";
import StaffingTab from "@/components/house-management/tabs/StaffingTab";
import ComplianceTab from "@/components/house-management/tabs/ComplianceTab";
import OperationsTab from "@/components/house-management/tabs/OperationsTab";

type HouseRisk = "GOOD" | "WARNING" | "CRITICAL";
type OccupancyStatus = "AVAILABLE" | "NEAR_FULL" | "FULL";
type AlertAction =
  | "VIEW_RESIDENTS"
  | "VIEW_STAFFING"
  | "VIEW_COVERAGE"
  | "VIEW_DASHBOARD";

type HouseItem = {
  id: string;
  code: string;
  name: string;
  address: string;
  programType: string;
  capacity: number;
  currentResidents: number;
  assignedStaff: number;
  complianceScore: number;
  openAlerts: number;
  status: string;
  risk: HouseRisk;
  supervisor: string;
  county: string;
  phone: string;
  primaryOccupancyModel: string;
  houseBillingNote: string;
};

type DashboardResidentSnapshotItem = {
  id: string;
  code?: string;
  name: string;
  maNumber?: string;
  roomLabel?: string;
  residentialPlacementType?: "FULL_TIME_247" | "HOME_VISIT_SPLIT" | null | string;
  behaviorSupportLevel?: "NONE" | "MODERATE" | "INTENSIVE" | string;
  appointmentLoad?: "LOW" | "MODERATE" | "HIGH" | string;
  careRateTier?: string;
  housingCoverage?: string;
  homeVisitSchedule?: string;
  status?: string;
  profileFlags?: {
    missingRoomLabel?: boolean;
    missingCareRateTier?: boolean;
    missingHousingCoverage?: boolean;
    missingHomeVisitSchedule?: boolean;
  };
};

type DashboardResponse = {
  house: {
    id: string;
    code: string;
    name: string;
    address: string;
    programType: string;
    county: string;
    phone: string;
    capacity: number;
    currentResidents: number;
    supervisor: string;
  };
  summary: {
    residents: number;
    fullTime247: number;
    homeVisitSplit: number;
    highNeedResidents: number;
    multiDspShifts: number;
    complianceScore: number;
    behaviorIntensive?: number;
    capacityUsed?: number;
    remainingBeds?: number;
    occupancyStatus?: OccupancyStatus;
    profileGaps?: number;
  };
  occupancy?: {
    capacity: number;
    currentResidents: number;
    remainingBeds: number;
    occupancyStatus: OccupancyStatus;
  };
  residentSnapshot?: DashboardResidentSnapshotItem[];
  coverage: Array<{
    id: string;
    time: string;
    service: string;
    shiftStatus: string;
    staffAssigned: Array<{
      name: string;
      role: string;
    }>;
    individualsCovered: string[];
    staffingRatioLabel: string;
    awakeRequired?: boolean;
    behaviorSupport?: boolean;
    note?: string | null;
  }>;
  alerts: Array<{
    id: string;
    level: "CRITICAL" | "WARNING" | "INFO";
    title: string;
    detail: string;
    actionLabel: string;
    action?: AlertAction;
  }>;
  compliance: Array<{
    key: string;
    label: string;
    score: number;
    status: "GOOD" | "WARNING" | "CRITICAL";
    lastReviewed: string;
  }>;
  timeline: Array<{
    id: string;
    at: string;
    title: string;
    description: string;
    level?: "CRITICAL" | "WARNING" | "INFO";
  }>;
};

type ResidentsResponse = {
  houseId: string;
  houseName: string;
  summary: {
    totalResidents: number;
    fullTime247: number;
    homeVisitSplit: number;
    highNeed: number;
    dailyMedUsers: number;
    behaviorIntensive: number;
  };
  items: Array<{
    id: string;
    code: string;
    name: string;
    maNumber: string;
    age: number;
    gender: string;
    room: string;
    residentialType: "FULL_TIME_247" | "HOME_VISIT_SPLIT" | null;
    homeVisitSchedule: string;
    housingCoverage: string;
    careRateTier: string;
    ispStatus: "CURRENT" | "DUE_SOON" | "OVERDUE";
    riskFlag: "HIGH" | "STANDARD";
    behaviorSupportLevel: "NONE" | "MODERATE" | "INTENSIVE" | string;
    medProfile: "DAILY" | "MULTIPLE_DAILY" | string;
    appointmentLoad: "LOW" | "MODERATE" | "HIGH" | string;
    status: string;
  }>;
};

type StaffingResponse = {
  houseId: string;
  houseName: string;
  summary: {
    assignedStaff: number;
    onDutyNow: number;
    multiDspShifts: number;
    behaviorSpecialistVisits: number;
    medCertStaff: number;
    trainingOverdue: number;
  };
  items: Array<{
    id: string;
    name: string;
    role: string;
    isPrimaryStaff?: boolean;
    shiftToday: string;
    trainingStatus: "CURRENT" | "DUE_SOON" | "OVERDUE" | string;
    medCertified: boolean;
    cpr: "CURRENT" | "EXPIRED" | string;
    driver: "ACTIVE" | "INACTIVE" | string;
    clearance: "CURRENT" | "EXPIRED" | string;
    status: "ON_DUTY" | "OFF_DUTY" | string;
  }>;
};

type AvailableIndividualsResponse = {
  items: AvailableIndividualOption[];
  total: number;
};

type AvailableEmployeeOption = {
  id: string;
  name: string;
  role?: string;
  status?: string;
};

type AvailableEmployeesResponse = {
  items: AvailableEmployeeOption[];
  total: number;
};

type HouseFormPayload = {
  name: string;
  code: string;
  programType: string;
  capacity: number;
  primaryOccupancyModel: string;
  county: string;
  phone: string;
  address1: string;
  billingNote: string;
  careComplexityNote: string;
};

type AssignStaffPayload = {
  employeeId: string;
  houseRole: string;
  isPrimaryStaff: boolean;
};

type UpdateStaffRolePayload = {
  employeeId: string;
  houseRole?: string;
  isPrimaryStaff?: boolean;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3333";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json();
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    try {
      const data = await response.json();
      message =
        data?.message && Array.isArray(data.message)
          ? data.message.join(" | ")
          : data?.message || message;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }

    throw new Error(message);
  }

  return response.json();
}

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    try {
      const data = await response.json();
      message =
        data?.message && Array.isArray(data.message)
          ? data.message.join(" | ")
          : data?.message || message;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }

    throw new Error(message);
  }

  return response.json();
}

function emptyHouseForm(): HouseFormPayload {
  return {
    name: "",
    code: "",
    programType: "Residential 6400",
    capacity: 1,
    primaryOccupancyModel: "SINGLE",
    county: "Blair",
    phone: "",
    address1: "",
    billingNote: "",
    careComplexityNote: "",
  };
}

export default function HouseManagementPage() {
  const [tab, setTab] = useState<HouseTabKey>("DASHBOARD");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [countyFilter, setCountyFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [openHouseModal, setOpenHouseModal] = useState(false);

  const [houses, setHouses] = useState<HouseItem[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState<string>("");

  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [residentsData, setResidentsData] = useState<ResidentsResponse | null>(null);
  const [staffingData, setStaffingData] = useState<StaffingResponse | null>(null);

  const [availableIndividuals, setAvailableIndividuals] = useState<
    AvailableIndividualOption[]
  >([]);
  const [availableEmployees, setAvailableEmployees] = useState<
    AvailableEmployeeOption[]
  >([]);

  const [housesLoading, setHousesLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [staffingLoading, setStaffingLoading] = useState(false);
  const [availableIndividualsLoading, setAvailableIndividualsLoading] =
    useState(false);
  const [availableEmployeesLoading, setAvailableEmployeesLoading] =
    useState(false);

  const [housesError, setHousesError] = useState("");
  const [dashboardError, setDashboardError] = useState("");
  const [residentsError, setResidentsError] = useState("");
  const [staffingError, setStaffingError] = useState("");
  const [availableIndividualsError, setAvailableIndividualsError] = useState("");
  const [availableEmployeesError, setAvailableEmployeesError] = useState("");

  const [saveHouseLoading, setSaveHouseLoading] = useState(false);
  const [saveHouseError, setSaveHouseError] = useState("");

  const [assignResidentLoading, setAssignResidentLoading] = useState(false);
  const [updateResidentProfileLoading, setUpdateResidentProfileLoading] =
    useState(false);
  const [removeResidentLoadingId, setRemoveResidentLoadingId] = useState<
    string | null
  >(null);

  const [assignStaffLoading, setAssignStaffLoading] = useState(false);
  const [updateStaffRoleLoading, setUpdateStaffRoleLoading] = useState(false);
  const [removeStaffLoadingId, setRemoveStaffLoadingId] = useState<string | null>(
    null
  );

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingHouseId, setEditingHouseId] = useState<string>("");

  const [houseForm, setHouseForm] = useState<HouseFormPayload>(emptyHouseForm());

  const housesQuery = useMemo(() => {
    const params = new URLSearchParams();

    if (search.trim()) params.set("search", search.trim());
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (countyFilter !== "ALL") params.set("county", countyFilter);
    if (riskFilter !== "ALL") params.set("risk", riskFilter);

    return params.toString();
  }, [search, statusFilter, countyFilter, riskFilter]);

  async function loadHouses(preferredHouseId?: string) {
    try {
      setHousesLoading(true);
      setHousesError("");

      const url = `${API_BASE}/house-management/houses${
        housesQuery ? `?${housesQuery}` : ""
      }`;

      const data = await fetchJson<{ items: HouseItem[]; total: number }>(url);

      setHouses(data.items || []);

      setSelectedHouseId((prev) => {
        if (preferredHouseId && data.items.some((h) => h.id === preferredHouseId)) {
          return preferredHouseId;
        }
        if (prev && data.items.some((h) => h.id === prev)) return prev;
        return data.items[0]?.id || "";
      });
    } catch (error) {
      setHouses([]);
      setSelectedHouseId("");
      setHousesError(
        error instanceof Error ? error.message : "Failed to load houses."
      );
    } finally {
      setHousesLoading(false);
    }
  }

  async function loadDashboardData(houseId: string) {
    try {
      setDashboardLoading(true);
      setDashboardError("");

      const data = await fetchJson<DashboardResponse>(
        `${API_BASE}/house-management/dashboard/${houseId}`
      );

      setDashboardData(data);
    } catch (error) {
      setDashboardData(null);
      setDashboardError(
        error instanceof Error ? error.message : "Failed to load dashboard."
      );
    } finally {
      setDashboardLoading(false);
    }
  }

  async function loadResidentsData(houseId: string) {
    try {
      setResidentsLoading(true);
      setResidentsError("");

      const data = await fetchJson<ResidentsResponse>(
        `${API_BASE}/house-management/residents/${houseId}`
      );

      setResidentsData(data);
    } catch (error) {
      setResidentsData(null);
      setResidentsError(
        error instanceof Error ? error.message : "Failed to load residents."
      );
    } finally {
      setResidentsLoading(false);
    }
  }

  async function loadStaffingData(houseId: string) {
    try {
      setStaffingLoading(true);
      setStaffingError("");

      const data = await fetchJson<StaffingResponse>(
        `${API_BASE}/house-management/staffing/${houseId}`
      );

      setStaffingData(data);
    } catch (error) {
      setStaffingData(null);
      setStaffingError(
        error instanceof Error ? error.message : "Failed to load staffing."
      );
    } finally {
      setStaffingLoading(false);
    }
  }

  async function loadAvailableIndividuals() {
    try {
      setAvailableIndividualsLoading(true);
      setAvailableIndividualsError("");

      const data = await fetchJson<AvailableIndividualsResponse>(
        `${API_BASE}/house-management/available-individuals?status=ACTIVE`
      );

      setAvailableIndividuals(data.items || []);
    } catch (error) {
      setAvailableIndividuals([]);
      setAvailableIndividualsError(
        error instanceof Error
          ? error.message
          : "Failed to load available individuals."
      );
    } finally {
      setAvailableIndividualsLoading(false);
    }
  }

  async function loadAvailableEmployees(houseId: string) {
    try {
      setAvailableEmployeesLoading(true);
      setAvailableEmployeesError("");

      const params = new URLSearchParams();
      params.set("houseId", houseId);
      params.set("status", "ACTIVE");

      const data = await fetchJson<AvailableEmployeesResponse>(
        `${API_BASE}/house-management/available-employees?${params.toString()}`
      );

      setAvailableEmployees(data.items || []);
    } catch (error) {
      setAvailableEmployees([]);
      setAvailableEmployeesError(
        error instanceof Error
          ? error.message
          : "Failed to load available employees."
      );
    } finally {
      setAvailableEmployeesLoading(false);
    }
  }

  async function refreshHouseResidentsViews(houseId: string) {
    await Promise.all([
      loadHouses(houseId),
      loadDashboardData(houseId),
      loadResidentsData(houseId),
      loadAvailableIndividuals(),
    ]);
  }

  async function refreshHouseStaffingViews(houseId: string) {
    await Promise.all([
      loadHouses(houseId),
      loadDashboardData(houseId),
      loadStaffingData(houseId),
      loadAvailableEmployees(houseId),
    ]);
  }

  useEffect(() => {
    void loadHouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [housesQuery]);

  useEffect(() => {
    if (!selectedHouseId) {
      setDashboardData(null);
      setResidentsData(null);
      setStaffingData(null);
      setAvailableIndividuals([]);
      setAvailableEmployees([]);
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        setDashboardLoading(true);
        setDashboardError("");

        const data = await fetchJson<DashboardResponse>(
          `${API_BASE}/house-management/dashboard/${selectedHouseId}`
        );

        if (cancelled) return;
        setDashboardData(data);
      } catch (error) {
        if (cancelled) return;
        setDashboardData(null);
        setDashboardError(
          error instanceof Error ? error.message : "Failed to load dashboard."
        );
      } finally {
        if (!cancelled) setDashboardLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [selectedHouseId]);

  useEffect(() => {
    if (!selectedHouseId || (tab !== "RESIDENTS" && tab !== "DASHBOARD")) return;

    let cancelled = false;

    async function run() {
      try {
        setResidentsLoading(true);
        setResidentsError("");

        const data = await fetchJson<ResidentsResponse>(
          `${API_BASE}/house-management/residents/${selectedHouseId}`
        );

        if (cancelled) return;
        setResidentsData(data);
      } catch (error) {
        if (cancelled) return;
        setResidentsData(null);
        setResidentsError(
          error instanceof Error ? error.message : "Failed to load residents."
        );
      } finally {
        if (!cancelled) setResidentsLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [selectedHouseId, tab]);

  useEffect(() => {
    if (!selectedHouseId || tab !== "RESIDENTS") return;

    let cancelled = false;

    async function run() {
      try {
        setAvailableIndividualsLoading(true);
        setAvailableIndividualsError("");

        const data = await fetchJson<AvailableIndividualsResponse>(
          `${API_BASE}/house-management/available-individuals?status=ACTIVE`
        );

        if (cancelled) return;
        setAvailableIndividuals(data.items || []);
      } catch (error) {
        if (cancelled) return;
        setAvailableIndividuals([]);
        setAvailableIndividualsError(
          error instanceof Error
            ? error.message
            : "Failed to load available individuals."
        );
      } finally {
        if (!cancelled) setAvailableIndividualsLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [selectedHouseId, tab]);

  useEffect(() => {
    if (!selectedHouseId || (tab !== "STAFFING" && tab !== "DASHBOARD")) return;

    let cancelled = false;

    async function run() {
      try {
        setStaffingLoading(true);
        setStaffingError("");

        const data = await fetchJson<StaffingResponse>(
          `${API_BASE}/house-management/staffing/${selectedHouseId}`
        );

        if (cancelled) return;
        setStaffingData(data);
      } catch (error) {
        if (cancelled) return;
        setStaffingData(null);
        setStaffingError(
          error instanceof Error ? error.message : "Failed to load staffing."
        );
      } finally {
        if (!cancelled) setStaffingLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [selectedHouseId, tab]);

  useEffect(() => {
    if (!selectedHouseId || tab !== "STAFFING") return;

    let cancelled = false;

    async function run() {
      try {
        setAvailableEmployeesLoading(true);
        setAvailableEmployeesError("");

        const params = new URLSearchParams();
        params.set("houseId", selectedHouseId);
        params.set("status", "ACTIVE");

        const data = await fetchJson<AvailableEmployeesResponse>(
          `${API_BASE}/house-management/available-employees?${params.toString()}`
        );

        if (cancelled) return;
        setAvailableEmployees(data.items || []);
      } catch (error) {
        if (cancelled) return;
        setAvailableEmployees([]);
        setAvailableEmployeesError(
          error instanceof Error
            ? error.message
            : "Failed to load available employees."
        );
      } finally {
        if (!cancelled) setAvailableEmployeesLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [selectedHouseId, tab]);

  const selectedHouse =
    houses.find((h) => h.id === selectedHouseId) ??
    houses[0] ?? {
      id: "",
      code: "",
      name: "",
      address: "",
      programType: "Residential 6400",
      capacity: 0,
      currentResidents: 0,
      assignedStaff: 0,
      complianceScore: 0,
      openAlerts: 0,
      status: "ACTIVE",
      risk: "WARNING" as HouseRisk,
      supervisor: "",
      county: "",
      phone: "",
      primaryOccupancyModel: "SINGLE",
      houseBillingNote: "",
    };

  const selectedHouseName =
    dashboardData?.house?.name ||
    residentsData?.houseName ||
    staffingData?.houseName ||
    selectedHouse.name ||
    "House";

  const resolvedResidentSnapshot = useMemo<DashboardResidentSnapshotItem[]>(() => {
    if (dashboardData?.residentSnapshot && dashboardData.residentSnapshot.length > 0) {
      return dashboardData.residentSnapshot;
    }

    if (residentsData?.items && residentsData.items.length > 0) {
      return residentsData.items.map((resident) => ({
        id: resident.id,
        code: resident.code || "",
        name: resident.name,
        maNumber: resident.maNumber || "",
        roomLabel: resident.room || "",
        residentialPlacementType: resident.residentialType || null,
        behaviorSupportLevel: resident.behaviorSupportLevel || "NONE",
        appointmentLoad: resident.appointmentLoad || "LOW",
        careRateTier: resident.careRateTier || "",
        housingCoverage: resident.housingCoverage || "",
        homeVisitSchedule: resident.homeVisitSchedule || "",
        status: resident.status || "",
        profileFlags: {
          missingRoomLabel: !String(resident.room || "").trim(),
          missingCareRateTier: !String(resident.careRateTier || "").trim(),
          missingHousingCoverage: !String(resident.housingCoverage || "").trim(),
          missingHomeVisitSchedule:
            resident.residentialType === "HOME_VISIT_SPLIT" &&
            !String(resident.homeVisitSchedule || "").trim(),
        },
      }));
    }

    return [];
  }, [dashboardData?.residentSnapshot, residentsData]);

  const resolvedProfileGapCount = useMemo(() => {
    if (
      typeof dashboardData?.summary?.profileGaps === "number" &&
      dashboardData.summary.profileGaps >= 0
    ) {
      return dashboardData.summary.profileGaps;
    }

    return resolvedResidentSnapshot.reduce((count, resident) => {
      const flags = resident.profileFlags;
      return (
        count +
        (flags?.missingRoomLabel ? 1 : 0) +
        (flags?.missingCareRateTier ? 1 : 0) +
        (flags?.missingHousingCoverage ? 1 : 0) +
        (flags?.missingHomeVisitSchedule ? 1 : 0)
      );
    }, 0);
  }, [dashboardData?.summary?.profileGaps, resolvedResidentSnapshot]);

  function openCreateModal() {
    setSaveHouseError("");
    setIsEditMode(false);
    setEditingHouseId("");
    setHouseForm(emptyHouseForm());
    setOpenHouseModal(true);
  }

  function openEditModal(houseId: string) {
    const house = houses.find((h) => h.id === houseId);
    if (!house) return;

    setSaveHouseError("");
    setIsEditMode(true);
    setEditingHouseId(houseId);
    setHouseForm({
      name: house.name || "",
      code: house.code || "",
      programType: house.programType || "Residential 6400",
      capacity: house.capacity || 1,
      primaryOccupancyModel: house.primaryOccupancyModel || "SINGLE",
      county: house.county || "Blair",
      phone: house.phone || "",
      address1: house.address || "",
      billingNote: house.houseBillingNote || "",
      careComplexityNote: "",
    });
    setOpenHouseModal(true);
  }

  async function handleSaveHouse() {
    try {
      setSaveHouseError("");

      if (!houseForm.name.trim()) {
        setSaveHouseError("House Name is required.");
        return;
      }

      if (!houseForm.code.trim()) {
        setSaveHouseError("House Code is required.");
        return;
      }

      if (!houseForm.capacity || Number(houseForm.capacity) <= 0) {
        setSaveHouseError("Capacity must be greater than 0.");
        return;
      }

      setSaveHouseLoading(true);

      if (isEditMode && editingHouseId) {
        const updated = await patchJson<{ id: string; code: string; name: string }>(
          `${API_BASE}/house-management/houses/${editingHouseId}`,
          {
            ...houseForm,
            capacity: Number(houseForm.capacity),
          }
        );

        setOpenHouseModal(false);
        await loadHouses(updated.id);
        setSelectedHouseId(updated.id);
        setTab("DASHBOARD");
      } else {
        const created = await postJson<{ id: string; code: string; name: string }>(
          `${API_BASE}/house-management/houses`,
          {
            ...houseForm,
            capacity: Number(houseForm.capacity),
          }
        );

        setOpenHouseModal(false);
        setHouseForm(emptyHouseForm());
        await loadHouses(created.id);
        setSelectedHouseId(created.id);
        setTab("DASHBOARD");
      }
    } catch (error) {
      setSaveHouseError(
        error instanceof Error ? error.message : "Failed to save house."
      );
    } finally {
      setSaveHouseLoading(false);
    }
  }

  async function handleAssignResident(individualId: string) {
    if (!selectedHouseId) {
      throw new Error("Please select a house first.");
    }

    try {
      setAssignResidentLoading(true);
      setResidentsError("");
      setDashboardError("");
      setAvailableIndividualsError("");

      await patchJson(
        `${API_BASE}/house-management/residents/${individualId}/assign-house`,
        {
          houseId: selectedHouseId,
        }
      );

      await refreshHouseResidentsViews(selectedHouseId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to assign resident.";
      setResidentsError(message);
      throw error;
    } finally {
      setAssignResidentLoading(false);
    }
  }

  async function handleRemoveResident(individualId: string) {
    try {
      setRemoveResidentLoadingId(individualId);
      setResidentsError("");
      setDashboardError("");
      setAvailableIndividualsError("");

      await patchJson(
        `${API_BASE}/house-management/residents/${individualId}/remove-house`,
        {}
      );

      if (selectedHouseId) {
        await refreshHouseResidentsViews(selectedHouseId);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove resident.";
      setResidentsError(message);
      throw error;
    } finally {
      setRemoveResidentLoadingId(null);
    }
  }

  async function handleUpdateResidentialProfile(
    individualId: string,
    payload: ResidentialProfilePayload
  ) {
    try {
      setUpdateResidentProfileLoading(true);
      setResidentsError("");
      setDashboardError("");

      await patchJson(
        `${API_BASE}/house-management/residents/${individualId}/residential-profile`,
        payload
      );

      if (selectedHouseId) {
        await Promise.all([
          loadResidentsData(selectedHouseId),
          loadDashboardData(selectedHouseId),
          loadHouses(selectedHouseId),
        ]);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update residential profile.";
      setResidentsError(message);
      throw error;
    } finally {
      setUpdateResidentProfileLoading(false);
    }
  }

  async function handleOpenAssignStaff() {
    if (!selectedHouseId) return;
    await loadAvailableEmployees(selectedHouseId);
  }

  async function handleAssignStaff(payload: AssignStaffPayload) {
    if (!selectedHouseId) {
      throw new Error("Please select a house first.");
    }

    try {
      setAssignStaffLoading(true);
      setStaffingError("");
      setDashboardError("");
      setAvailableEmployeesError("");

      await patchJson(
        `${API_BASE}/house-management/staff/${payload.employeeId}/assign-house`,
        {
          houseId: selectedHouseId,
          houseRole: payload.houseRole,
          isPrimaryStaff: payload.isPrimaryStaff,
        }
      );

      await refreshHouseStaffingViews(selectedHouseId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to assign staff.";
      setStaffingError(message);
      throw error;
    } finally {
      setAssignStaffLoading(false);
    }
  }

  async function handleRemoveStaff(employeeId: string) {
    try {
      setRemoveStaffLoadingId(employeeId);
      setStaffingError("");
      setDashboardError("");
      setAvailableEmployeesError("");

      await patchJson(
        `${API_BASE}/house-management/staff/${employeeId}/remove-house`,
        {}
      );

      if (selectedHouseId) {
        await refreshHouseStaffingViews(selectedHouseId);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove staff.";
      setStaffingError(message);
      throw error;
    } finally {
      setRemoveStaffLoadingId(null);
    }
  }

  async function handleUpdateStaffRole(payload: UpdateStaffRolePayload) {
    try {
      setUpdateStaffRoleLoading(true);
      setStaffingError("");
      setDashboardError("");

      await patchJson(
        `${API_BASE}/house-management/staff/${payload.employeeId}/house-role`,
        {
          houseRole: payload.houseRole,
          isPrimaryStaff: payload.isPrimaryStaff,
        }
      );

      if (selectedHouseId) {
        await Promise.all([
          loadStaffingData(selectedHouseId),
          loadDashboardData(selectedHouseId),
          loadHouses(selectedHouseId),
          loadAvailableEmployees(selectedHouseId),
        ]);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update staff role.";
      setStaffingError(message);
      throw error;
    } finally {
      setUpdateStaffRoleLoading(false);
    }
  }

  const staffingSaving =
    assignStaffLoading || updateStaffRoleLoading || removeStaffLoadingId !== null;

  return (
    <div className="min-h-[calc(100vh-60px)] bg-bac-bg p-6">
      <div className="mb-6 rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-bac-panel to-amber-950/20 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-2xl font-semibold tracking-tight text-bac-text">
              House Management
            </div>
            <div className="mt-1 text-sm text-bac-muted">
              Manage residential homes, occupancy, 24/7 care operations, staffing,
              medication, appointments, behavior support, and 6400 compliance.
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="violet">Residential 6400</Badge>
              <Badge variant="amber">24 / 7 Housing & Care</Badge>
              <Badge variant="sky">Home-Visit Split Supported</Badge>
              <Badge variant="muted">Live Data + Preview Mix</Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedHouseId}
              onChange={(v) => {
                setSelectedHouseId(v);
                setTab("DASHBOARD");
              }}
              options={
                houses.length > 0
                  ? houses.map((h) => ({
                      value: h.id,
                      label: `${h.name} (${h.code})`,
                    }))
                  : [{ value: "", label: housesLoading ? "Loading..." : "No houses" }]
              }
            />

            <button
              onClick={openCreateModal}
              className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
            >
              + New House
            </button>

            <button
              onClick={() => alert("UI only. Wire export later.")}
              className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
            >
              Export
            </button>

            <Link
              href="/reports"
              className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95"
            >
              Go to Reports
            </Link>
          </div>
        </div>
      </div>

      {(housesError ||
        dashboardError ||
        residentsError ||
        staffingError ||
        availableIndividualsError ||
        availableEmployeesError) && (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {[
            housesError,
            dashboardError,
            residentsError,
            staffingError,
            availableIndividualsError,
            availableEmployeesError,
          ]
            .filter(Boolean)
            .join(" | ")}
        </div>
      )}

      <HouseTabs value={tab} onChange={setTab} />

      {tab === "HOUSES" && (
        <HousesTab
          houses={houses}
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          countyFilter={countyFilter}
          setCountyFilter={setCountyFilter}
          riskFilter={riskFilter}
          setRiskFilter={setRiskFilter}
          onViewDashboard={(houseId) => {
            setSelectedHouseId(houseId);
            setTab("DASHBOARD");
          }}
          onEditHouse={openEditModal}
        />
      )}

      {tab === "DASHBOARD" && dashboardData && (
        <DashboardTab
          selectedHouse={{
            ...selectedHouse,
            ...dashboardData.house,
          }}
          fullTime247Count={dashboardData.summary.fullTime247}
          homeVisitSplitCount={dashboardData.summary.homeVisitSplit}
          highNeedCount={dashboardData.summary.highNeedResidents}
          multiDspShiftCount={dashboardData.summary.multiDspShifts}
          behaviorIntensiveCount={dashboardData.summary.behaviorIntensive ?? 0}
          capacityUsed={
            dashboardData.summary.capacityUsed ?? dashboardData.house.currentResidents
          }
          remainingBeds={
            typeof dashboardData.summary.remainingBeds === "number"
              ? dashboardData.summary.remainingBeds
              : Math.max(
                  (dashboardData.occupancy?.capacity ?? dashboardData.house.capacity ?? 0) -
                    (dashboardData.occupancy?.currentResidents ??
                      dashboardData.house.currentResidents ??
                      0),
                  0
                )
          }
          occupancyStatus={dashboardData.summary.occupancyStatus}
          profileGaps={resolvedProfileGapCount}
          occupancy={dashboardData.occupancy}
          residentSnapshot={resolvedResidentSnapshot}
          coverage={dashboardData.coverage}
          alerts={dashboardData.alerts}
          compliance={dashboardData.compliance}
          timeline={dashboardData.timeline}
          onGoResidents={() => setTab("RESIDENTS")}
          onGoStaffing={() => setTab("STAFFING")}
        />
      )}

      {tab === "DASHBOARD" && !dashboardData && (
        <div className="rounded-2xl border border-bac-border bg-bac-panel p-6 text-bac-muted">
          {dashboardLoading ? "Loading dashboard..." : "No dashboard data available."}
        </div>
      )}

      {tab === "RESIDENTS" && residentsData && (
        <ResidentsTab
          selectedHouseName={residentsData.houseName}
          residents={residentsData.items}
          fullTime247Count={residentsData.summary.fullTime247}
          homeVisitSplitCount={residentsData.summary.homeVisitSplit}
          highNeedCount={residentsData.summary.highNeed}
          availableIndividuals={availableIndividuals}
          assignBusy={assignResidentLoading || availableIndividualsLoading}
          profileBusy={updateResidentProfileLoading}
          removeBusyId={removeResidentLoadingId}
          onAssignResident={handleAssignResident}
          onRemoveResident={handleRemoveResident}
          onUpdateResidentialProfile={handleUpdateResidentialProfile}
        />
      )}

      {tab === "RESIDENTS" && !residentsData && (
        <div className="rounded-2xl border border-bac-border bg-bac-panel p-6 text-bac-muted">
          {residentsLoading ? "Loading residents..." : "No residents data available."}
        </div>
      )}

      {tab === "STAFFING" && staffingData && (
        <StaffingTab
          selectedHouseName={staffingData.houseName}
          staff={staffingData.items}
          specialistsCount={staffingData.summary.behaviorSpecialistVisits}
          multiDspShiftCount={staffingData.summary.multiDspShifts}
          availableEmployees={availableEmployees}
          availableEmployeesLoading={availableEmployeesLoading}
          staffingSaving={staffingSaving}
          onOpenAssignStaff={handleOpenAssignStaff}
          onAssignStaff={handleAssignStaff}
          onRemoveStaff={handleRemoveStaff}
          onUpdateStaffRole={handleUpdateStaffRole}
        />
      )}

      {tab === "STAFFING" && !staffingData && (
        <div className="rounded-2xl border border-bac-border bg-bac-panel p-6 text-bac-muted">
          {staffingLoading ? "Loading staffing..." : "No staffing data available."}
        </div>
      )}

      {tab === "COMPLIANCE" && (
        <ComplianceTab
          selectedHouseName={selectedHouseName}
          compliance={DEMO_COMPLIANCE}
          drills={DEMO_DRILLS}
        />
      )}

      {tab === "OPERATIONS" && (
        <OperationsTab
          selectedHouseName={selectedHouseName}
          meals={DEMO_MEALS}
          meds={DEMO_MEDS}
          chores={DEMO_CHORES}
          appointments={DEMO_APPOINTMENTS}
          specialists={DEMO_SPECIALISTS}
        />
      )}

      <Modal
        open={openHouseModal}
        title={isEditMode ? "Edit House" : "New House"}
        onClose={() => setOpenHouseModal(false)}
      >
        {saveHouseError && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {saveHouseError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="House Name">
            <input
              value={houseForm.name}
              onChange={(e) =>
                setHouseForm((prev) => ({ ...prev, name: e.target.value }))
              }
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
            />
          </FormField>

          <FormField label="House Code">
            <input
              value={houseForm.code}
              onChange={(e) =>
                setHouseForm((prev) => ({ ...prev, code: e.target.value }))
              }
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
            />
          </FormField>

          <FormField label="Program Type">
            <Select
              value={houseForm.programType}
              onChange={(v) =>
                setHouseForm((prev) => ({ ...prev, programType: v }))
              }
              options={[{ value: "Residential 6400", label: "Residential 6400" }]}
            />
          </FormField>

          <FormField label="Capacity">
            <input
              type="number"
              value={houseForm.capacity}
              onChange={(e) =>
                setHouseForm((prev) => ({
                  ...prev,
                  capacity: Number(e.target.value || 0),
                }))
              }
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
            />
          </FormField>

          <FormField label="Primary Occupancy Model">
            <Select
              value={houseForm.primaryOccupancyModel}
              onChange={(v) =>
                setHouseForm((prev) => ({
                  ...prev,
                  primaryOccupancyModel: v,
                }))
              }
              options={[
                { value: "SINGLE", label: "Single Resident Focus" },
                { value: "DOUBLE", label: "Two Residents Typical" },
                { value: "MIXED", label: "Mixed Occupancy" },
              ]}
            />
          </FormField>

          <FormField label="County">
            <Select
              value={houseForm.county}
              onChange={(v) =>
                setHouseForm((prev) => ({ ...prev, county: v }))
              }
              options={[
                { value: "Blair", label: "Blair" },
                { value: "Centre", label: "Centre" },
              ]}
            />
          </FormField>

          <FormField label="Phone">
            <input
              value={houseForm.phone}
              onChange={(e) =>
                setHouseForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
            />
          </FormField>

          <FormField label="Address" className="md:col-span-2">
            <input
              value={houseForm.address1}
              onChange={(e) =>
                setHouseForm((prev) => ({ ...prev, address1: e.target.value }))
              }
              className="h-10 w-full rounded-xl border border-bac-border bg-bac-panel px-3 text-sm text-bac-text outline-none"
            />
          </FormField>

          <FormField label="Billing / Occupancy Note" className="md:col-span-2">
            <textarea
              value={houseForm.billingNote}
              onChange={(e) =>
                setHouseForm((prev) => ({
                  ...prev,
                  billingNote: e.target.value,
                }))
              }
              className="min-h-[100px] w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text outline-none"
            />
          </FormField>

          <FormField label="Care Complexity Note" className="md:col-span-2">
            <textarea
              value={houseForm.careComplexityNote}
              onChange={(e) =>
                setHouseForm((prev) => ({
                  ...prev,
                  careComplexityNote: e.target.value,
                }))
              }
              className="min-h-[100px] w-full rounded-xl border border-bac-border bg-bac-panel px-3 py-2 text-sm text-bac-text outline-none"
            />
          </FormField>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => setOpenHouseModal(false)}
            className="rounded-xl border border-bac-border bg-bac-panel px-4 py-2 text-sm text-bac-text hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveHouse}
            disabled={saveHouseLoading}
            className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveHouseLoading
              ? isEditMode
                ? "Saving..."
                : "Creating..."
              : isEditMode
                ? "Save Changes"
                : "Create House"}
          </button>
        </div>
      </Modal>
    </div>
  );
}