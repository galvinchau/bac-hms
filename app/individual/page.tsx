"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type IndividualRow = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  dob: string | null;
  primaryPhone: string | null;
  email: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  zip: string | null;
  branch: string | null;
  location: string | null;
};

type SearchResponse = {
  items: IndividualRow[];
  total: number;
  page: number;
  pageSize: number;
};

export default function SearchIndividualPage() {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [data, setData] = useState<SearchResponse>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
  });
  const [loading, setLoading] = useState(false);

  const load = async (page = 1, query = q) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(data.pageSize || 10));
      if (query.trim()) params.set("q", query.trim());

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
    // load lần đầu
    load(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

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

      {/* Search bar */}
      <div className="rounded-xl border border-bac-border bg-bac-bg p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex-1 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by Code, Name, City, County..."
            className="flex-1 px-3 py-2 rounded-xl border border-bac-border bg-bac-panel"
          />
          <button
            type="button"
            onClick={() => load(1, q)}
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

      {/* Table */}
      <div className="rounded-xl border border-bac-border bg-bac-bg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bac-panel">
            <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
              <th>Code</th>
              <th>Name</th>
              <th>DOB</th>
              <th>City</th>
              <th>County</th>
              <th>State</th>
              <th>ZIP</th>
              <th>Phone</th>
              <th>Email</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && !loading && (
              <tr>
                <td
                  className="px-3 py-3 text-bac-muted text-center"
                  colSpan={10}
                >
                  No individuals found. Try another search.
                </td>
              </tr>
            )}

            {data.items.map((row) => (
              <tr
                key={row.id}
                className="border-t border-bac-border hover:bg-bac-panel/60"
              >
                <td className="px-3 py-2 whitespace-nowrap">{row.code}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {row.lastName}, {row.firstName}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{row.dob || ""}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {row.city || ""}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {row.county || ""}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {row.state || ""}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{row.zip || ""}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {row.primaryPhone || ""}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {row.email || ""}
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
            ))}
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
            onClick={() => load(data.page - 1)}
            className="px-3 py-1 rounded-lg border border-bac-border disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={data.page >= totalPages || loading}
            onClick={() => load(data.page + 1)}
            className="px-3 py-1 rounded-lg border border-bac-border disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
