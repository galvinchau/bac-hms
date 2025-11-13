// Web/components/individual/useIspBspForm.ts
"use client";

import { useEffect, useState } from "react";

// Toàn bộ field của form ISP & BSP (đều lưu dạng string cho đơn giản)
export type IspBspFormValues = {
  // ISP - General
  planStatus: string;
  serviceCoordinator: string;
  effectiveFrom: string;
  effectiveTo: string;
  generalNotes: string;

  // ISP - Outcomes
  outcomeStatement: string;
  outcomeService: string;
  outcomeStatus: string;

  // ISP - Authorized services (1 hàng đơn giản)
  authService: string;
  authContractUnits: string;
  authWeeklyUnits: string;
  authWeekToDateUnits: string;
  authCumUnitsDone: string;
  authRemaining: string;
  authNote: string;

  // ISP - Health & Safety
  healthAllergiesRisks: string;
  healthEmergencyPlan: string;

  // BSP - Overview
  behaviorsOfConcern: string[];
  behaviorsOther: string;
  bspFrequency: string;
  bspSeverity: string;
  bspFunction: string;

  // BSP - Triggers & Prevention
  bspTrigger: string;
  bspPreventionStrategy: string;

  // BSP - Intervention Procedures
  bspBehavior: string;
  bspStaffResponse: string;
  bspReinforcement: string;

  // BSP - Data & Team
  bspDataCollectionMethod: string;
  bspResponsibleStaff: string;

  // BSP - Attachments
  attachmentsLink: string;
  attachmentsNotes: string;
};

// Giá trị mặc định – khớp với default UI hiện tại
export const DEFAULT_ISP_BSP_FORM: IspBspFormValues = {
  // ISP - General
  planStatus: "Active",
  serviceCoordinator: "",
  effectiveFrom: "",
  effectiveTo: "",
  generalNotes: "",

  // ISP - Outcomes
  outcomeStatement: "",
  outcomeService: "",
  outcomeStatus: "Active",

  // ISP - Authorized services
  authService: "",
  authContractUnits: "",
  authWeeklyUnits: "",
  authWeekToDateUnits: "",
  authCumUnitsDone: "",
  authRemaining: "",
  authNote: "",

  // ISP - Health & Safety
  healthAllergiesRisks: "",
  healthEmergencyPlan: "",

  // BSP - Overview
  behaviorsOfConcern: [],
  behaviorsOther: "",
  bspFrequency: "Daily",
  bspSeverity: "Mild",
  bspFunction: "",

  // BSP - Triggers & Prevention
  bspTrigger: "",
  bspPreventionStrategy: "",

  // BSP - Intervention Procedures
  bspBehavior: "",
  bspStaffResponse: "",
  bspReinforcement: "",

  // BSP - Data & Team
  bspDataCollectionMethod: "ABC",
  bspResponsibleStaff: "",

  // BSP - Attachments
  attachmentsLink: "",
  attachmentsNotes: "",
};

// helper: build đúng URL mà API đang mong đợi (có cả query individualId)
function buildIspBspUrl(individualId: string) {
  const encoded = encodeURIComponent(individualId);
  return `/api/individuals/${encoded}/isp-bsp?individualId=${encoded}`;
}

export function useIspBspForm(individualId?: string) {
  const [data, setData] = useState<IspBspFormValues | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // chưa có id thì clear state + không gọi API
    if (!individualId) {
      setData(null);
      setError("Missing individual id");
      setSuccess(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await fetch(buildIspBspUrl(individualId));
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || "Failed to load ISP/BSP data");
        }
        const json = await res.json();
        if (json.data) {
          setData(json.data as IspBspFormValues);
        } else {
          setData(null);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load ISP/BSP data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [individualId]);

  const save = async (values: IspBspFormValues) => {
    if (!individualId) {
      setError("Missing individual id");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(buildIspBspUrl(individualId), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ formData: values }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to save ISP/BSP data");
      }

      const json = await res.json();
      if (json.data) {
        setData(json.data as IspBspFormValues);
      } else {
        setData(values);
      }
      setSuccess("Saved successfully");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save ISP/BSP data");
    } finally {
      setSaving(false);
    }
  };

  return {
    data,
    setData,
    loading,
    saving,
    error,
    success,
    save,
  };
}
