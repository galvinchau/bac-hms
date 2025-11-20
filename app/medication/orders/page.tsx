"use client";

import { useEffect, useState } from "react";

interface MedicationOrder {
  id: string;
  individualId: string;
  medicationName: string;
  form: string | null;
  doseValue: number;
  doseUnit: string;
  route: string | null;
  type: string;
  frequencyText: string | null;
  timesOfDay: string[]; // từ Prisma: String[]
  startDate: string; // sẽ nhận ISO string từ API
  endDate: string | null;
  prescriberName: string | null;
  pharmacyName: string | null;
  indications: string | null;
  allergyFlag: boolean;
  status: string; // enum MedicationOrderStatus
}

export default function MedicationOrdersPage() {
  const [orders, setOrders] = useState<MedicationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function loadOrders() {
      try {
        const individualId = localStorage.getItem("selectedIndividualId");

        if (!individualId) {
          setError("No individual selected");
          setLoading(false);
          return;
        }

        const res = await fetch(
          `/api/medication/orders?individualId=${individualId}`
        );

        if (!res.ok) {
          throw new Error("Failed to load orders");
        }

        const data = await res.json();

        // 👈 Khớp với route.ts: { orders }
        setOrders(data.orders ?? []);
      } catch (err: any) {
        console.error("Load medication orders error:", err);
        setError(err?.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  if (loading) {
    return <p className="text-white p-4">Loading orders...</p>;
  }

  if (error) {
    return <p className="text-red-400 p-4">{error}</p>;
  }

  return (
    <div className="p-6 text-white">
      <h2 className="text-xl font-semibold mb-4">Medication Orders</h2>

      {orders.length === 0 && (
        <p className="text-gray-400">No medication orders found.</p>
      )}

      {orders.length > 0 && (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="p-2">Medication</th>
              <th className="p-2">Route</th>
              <th className="p-2">Type</th>
              <th className="p-2">Schedule</th>
              <th className="p-2">Start / End</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-gray-800">
                <td className="p-2">{o.medicationName}</td>
                <td className="p-2">{o.route}</td>
                <td className="p-2">{o.type}</td>
                <td className="p-2">{o.frequencyText}</td>
                <td className="p-2">
                  {o.startDate?.slice(0, 10)} →{" "}
                  {o.endDate ? o.endDate.slice(0, 10) : "-"}
                </td>
                <td className="p-2">{o.status ?? "ACTIVE"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
