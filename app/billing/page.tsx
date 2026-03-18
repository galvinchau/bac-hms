"use client";

import React, { useState } from "react";
import BillingHeader from "@/components/billing/BillingHeader";
import BillingTabs from "@/components/billing/BillingTabs";
import BillingWorkspaceTab from "@/components/billing/BillingWorkspaceTab";
import BillingClaimsTab from "@/components/billing/BillingClaimsTab";
import BillingDenialsTab from "@/components/billing/BillingDenialsTab";
import BillingPaymentsTab from "@/components/billing/BillingPaymentsTab";
import BillingSettingsTab from "@/components/billing/BillingSettingsTab";
import type { BillingTab } from "@/components/billing/BillingTypes";

export default function BillingPage() {
  const [tab, setTab] = useState<BillingTab>("WORKSPACE");

  return (
    <div className="min-h-[calc(100vh-60px)] bg-bac-bg p-6">
      <BillingHeader
        onRefresh={() => alert("Phase 1 layout only. Refresh wiring comes later.")}
        onExport={() => alert("Phase 1 layout only. Export wiring comes later.")}
        onCreateClaims={() =>
          alert("Phase 1 layout only. Claim creation workflow comes next.")
        }
      />

      <BillingTabs value={tab} onChange={setTab} />

      {tab === "WORKSPACE" ? <BillingWorkspaceTab /> : null}
      {tab === "CLAIMS" ? <BillingClaimsTab /> : null}
      {tab === "DENIALS" ? <BillingDenialsTab /> : null}
      {tab === "PAYMENTS" ? <BillingPaymentsTab /> : null}
      {tab === "SETTINGS" ? <BillingSettingsTab /> : null}
    </div>
  );
}