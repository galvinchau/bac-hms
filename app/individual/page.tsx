"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type IndividualStatus = "PENDING" | "ACTIVE" | "INACTIVE";

type IndividualRow = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  dob: string | null;
  primaryPhone: string | null;
  // email removed / optional depending on your latest UI
  email?: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  zip: string | null;
  branch: string | null;
  location: string | null;

  // status from backend
  status?: IndividualStatus | null;
};

type SearchResponse = {
  items: IndividualRow[];
  total: number;
  page: number;
  pageSize: number;
};

const STATUS_OPTIONS: { key: IndividualStatus; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  { key: "ACTIVE", label: "Active" },
  { key: "INACTIVE", label: "In-active" },
];

type SortDir = "asc" | "desc";

export default function SearchIndividualPage() {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [data, setData] = useState<SearchResponse>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
  });
  const [loading, setLoading] = useState(false);

  // ✅ NEW: sort by Name
  const [nameSortDir, setNameSortDir] = useState<SortDir>("asc");

  // ✅ DEFAULT: only Pending + Active checked
  const [statusFilter, setStatusFilter] = useState<
    Record<IndividualStatus, boolean>
  >({
    PENDING: true,
    ACTIVE: true,
    INACTIVE: false, // ✅ CHANGE: default off
  });

  const selectedStatuses = useMemo(() => {
    const keys = STATUS_OPTIONS.map((o) => o.key);
    const selected = keys.filter((k) => statusFilter[k]);
    // If none selected, treat as "all" to avoid empty screen confusion
    return selected.length === 0 ? keys : selected;
  }, [statusFilter]);

  const isAllStatusesSelected = useMemo(() => {
    return selectedStatuses.length === STATUS_OPTIONS.length;
  }, [selectedStatuses]);

  const load = async (page = 1, query = q, statuses = selectedStatuses) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(data.pageSize || 50));
      if (query.trim()) params.set("q", query.trim());

      // ✅ send status filters to API (comma-separated)
      if (
        statuses &&
        statuses.length > 0 &&
        statuses.length < STATUS_OPTIONS.length
      ) {
        params.set("status", statuses.join(","));
      }

      const res = await fetch(`/api/individuals?${params.toString()}`);
      if (!res.ok) {
        alert(`Load failed: HTTP ${res.status}`);
        return;
      }
      const json = (await res.json()) as SearchResponse;
      setData(json);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ✅ load first time with default filters (Pending + Active)
    load(1, "", selectedStatuses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ reload immediately when status filter changes
  useEffect(() => {
    load(1, q, selectedStatuses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatuses.join("|")]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  const statusText = (s?: IndividualStatus | null) => {
    const v = String(s || "")
      .toUpperCase()
      .trim();
    if (v === "ACTIVE") return "ACTIVE";
    if (v === "INACTIVE") return "INACTIVE";
    return "PENDING";
  };

  // ✅ NEW: client-side sort by Name (LastName, FirstName)
  const sortedItems = useMemo(() => {
    const items = [...data.items];
    items.sort((a, b) => {
      const aName = `${a.lastName || ""}, ${a.firstName || ""}`
        .toUpperCase()
        .trim();
      const bName = `${b.lastName || ""}, ${b.firstName || ""}`
        .toUpperCase()
        .trim();

      if (aName < bName) return nameSortDir === "asc" ? -1 : 1;
      if (aName > bName) return nameSortDir === "asc" ? 1 : -1;
      return 0;
    });
    return items;
  }, [data.items, nameSortDir]);

  const toggleNameSort = () => {
    setNameSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Search Individual</h1>
        <button
          type="button"
          onClick={() => router.push("/individual/new")}
          className="px-4 py-2 rounded-xl bg-bac-primary text-white hover:opacity-90"
        >
          + New Individual
        </button>
      </div>

      {/* Search bar + Status filters */}
      <div className="rounded-xl border border-bac-border bg-bac-bg p-4 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex-1 flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by Code, Name, City, County..."
              className="flex-1 px-3 py-2 rounded-xl border border-bac-border bg-bac-panel"
            />
            <button
              type="button"
              onClick={() => load(1, q, selectedStatuses)}
              className="px-4 py-2 rounded-xl border border-bac-border bg-bac-panel hover:bg-bac-bg text-sm"
            >
              Search
            </button>
          </div>

          <div className="text-sm text-bac-muted">
            {loading
              ? "Loading..."
              : `Total: ${data.total} record${data.total === 1 ? "" : "s"}`}
          </div>
        </div>

        {/* Status filter checkboxes */}
        <div className="flex flex-wrap items-center gap-4 text-sm md:justify-end">
          {STATUS_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className="flex items-center gap-2 select-none"
            >
              <input
                type="checkbox"
                checked={statusFilter[opt.key]}
                onChange={(e) =>
                  setStatusFilter((prev) => ({
                    ...prev,
                    [opt.key]: e.target.checked,
                  }))
                }
                className="h-4 w-4"
              />
              <span className="text-bac-text">{opt.label}</span>
            </label>
          ))}

          <span className="text-xs text-bac-muted">
            {isAllStatusesSelected
              ? ""
              : `Filtering: ${selectedStatuses.join(", ")}`}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-bac-border bg-bac-bg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bac-panel">
            <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
              <th>Code</th>

              {/* ✅ Click to sort by Name */}
              <th
                className="cursor-pointer select-none"
                onClick={toggleNameSort}
                title="Sort by Name"
              >
                Name{" "}
                <span className="text-xs text-bac-muted">
                  {nameSortDir === "asc" ? "▲" : "▼"}
                </span>
              </th>

              <th>DOB</th>
              <th>City</th>
              <th>County</th>
              <th>State</th>
              <th>ZIP</th>
              <th>Phone</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 && !loading && (
              <tr>
                <td
                  className="px-3 py-3 text-bac-muted text-center"
                  colSpan={10}
                >
                  No individuals found. Try another search.
                </td>
              </tr>
            )}

            {sortedItems.map((row) => {
              const s = statusText(row.status);
              return (
                <tr
                  key={row.id}
                  className="border-t border-bac-border hover:bg-bac-panel/60"
                >
                  <td className="px-3 py-2 whitespace-nowrap">{row.code}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.lastName}, {row.firstName}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.dob || ""}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.city || ""}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.county || ""}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.state || ""}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.zip || ""}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.primaryPhone || ""}
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={
                        s === "ACTIVE"
                          ? "text-green-400 font-semibold"
                          : s === "INACTIVE"
                            ? "text-red-400 font-semibold"
                            : "text-yellow-400 font-semibold"
                      }
                    >
                      {s}
                    </span>
                  </td>

                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => router.push(`/individual/${row.id}`)}
                      className="px-3 py-1 rounded-lg border border-bac-border bg-bac-panel hover:bg-bac-bg text-xs"
                    >
                      View / Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-bac-muted">
        <div>
          Page {data.page} / {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={data.page <= 1 || loading}
            onClick={() => load(data.page - 1, q, selectedStatuses)}
            className="px-3 py-1 rounded-lg border border-bac-border disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={data.page >= totalPages || loading}
            onClick={() => load(data.page + 1, q, selectedStatuses)}
            className="px-3 py-1 rounded-lg border border-bac-border disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
