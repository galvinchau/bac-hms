import React, { Suspense } from "react";
import OrdersClient from "./OrdersClient";

export default function MedicationOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-bac-muted">
          Loading Medication Orders...
        </div>
      }
    >
      <OrdersClient />
    </Suspense>
  );
}
