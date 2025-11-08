"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type EmploymentStatus = "Active" | "Inactive" | "On Leave" | "";

// Shape for list view
interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  phone: string | null;
  role: string | null;
  branch: string | null;
  status: string | null;
  hireDate: string | null;
  workLocation: string | null;
  createdAt: string;
}

export default function SearchEmployeePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchName, setSearchName] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmploymentStatus>("");

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/employees");
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.message || "Failed to load employees");
        }

        const data = await res.json();
        setEmployees(data || []);
      } catch (err: any) {
        console.error("Error loading employees:", err);
        setError(err?.message || "Failed to load employees");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const branchOptions = useMemo(() => {
    const set = new Set(
      employees
        .map((e) => e.branch?.trim())
        .filter((b): b is string => Boolean(b))
    );
    return Array.from(set).sort();
  }, [employees]);

  const statusOptions = useMemo(() => {
    const set = new Set(
      employees
        .map((e) => e.status?.trim())
        .filter((s): s is string => Boolean(s))
    );
    return Array.from(set).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const fullName = `${emp.firstName} ${emp.middleName ?? ""} ${
        emp.lastName
      }`
        .toLowerCase()
        .trim();

      const term = searchName.toLowerCase().trim();

      const matchesName =
        term === "" ||
        fullName.includes(term) ||
        emp.employeeId.toLowerCase().includes(term);

      const matchesBranch =
        !branchFilter ||
        (emp.branch || "").toLowerCase() === branchFilter.toLowerCase();

      const matchesStatus =
        !statusFilter ||
        (emp.status || "").toLowerCase() === statusFilter.toLowerCase();

      return matchesName && matchesBranch && matchesStatus;
    });
  }, [employees, searchName, branchFilter, statusFilter]);

  const formatDate = (value: string | null) => {
    if (!value) return "";
    return value;
  };

  return (
    <div className="min-h-screen bg-bac-bg text-bac-text">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Search Employee
            </h1>
            <p className="mt-1 text-sm text-bac-muted">
              Find employees by name, branch, or status.
            </p>
          </div>

          <Link
            href="/employees/new"
            className="rounded-xl bg-bac-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-bac-primary/90"
          >
            + New Employee
          </Link>
        </div>

        {/* Filters */}
        <section className="mb-4 rounded-2xl border border-bac-border bg-bac-panel p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label
                htmlFor="searchName"
                className="text-xs font-medium uppercase tracking-wide text-bac-muted"
              >
                Search (Name or Employee ID)
              </label>
              <input
                id="searchName"
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                placeholder="e.g. John, Chau, BAC-E-2025-001"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="branchFilter"
                className="text-xs font-medium uppercase tracking-wide text-bac-muted"
              >
                Branch
              </label>
              <select
                id="branchFilter"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
              >
                <option value="">All branches</option>
                {branchOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="statusFilter"
                className="text-xs font-medium uppercase tracking-wide text-bac-muted"
              >
                Status
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as EmploymentStatus)
                }
                className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
              >
                <option value="">All statuses</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                {/* fallback fixed list nếu dữ liệu chưa có đủ */}
                {!statusOptions.length && (
                  <>
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="rounded-2xl border border-bac-border bg-bac-panel p-4">
          {loading ? (
            <p className="text-sm text-bac-muted">Loading employees...</p>
          ) : error ? (
            <p className="text-sm text-red-400">
              Failed to load employees: {error}
            </p>
          ) : filteredEmployees.length === 0 ? (
            <p className="text-sm text-bac-muted">
              No employees found with current filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-bac-border/60 text-xs uppercase tracking-wide text-bac-muted">
                    <th className="px-3 py-2">Employee ID</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Branch</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Hire Date</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => {
                    const fullName = [
                      emp.firstName,
                      emp.middleName || "",
                      emp.lastName,
                    ]
                      .join(" ")
                      .replace(/\s+/g, " ")
                      .trim();

                    return (
                      <tr
                        key={emp.id}
                        className="border-b border-bac-border/40 hover:bg-bac-bg/40"
                      >
                        <td className="px-3 py-2 align-middle font-mono text-xs text-bac-muted">
                          {emp.employeeId}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="text-sm font-medium">
                            {fullName || "-"}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-middle text-xs">
                          {emp.role || "-"}
                        </td>
                        <td className="px-3 py-2 align-middle text-xs">
                          {emp.branch || "-"}
                        </td>
                        <td className="px-3 py-2 align-middle text-xs">
                          {emp.status || "-"}
                        </td>
                        <td className="px-3 py-2 align-middle text-xs">
                          {formatDate(emp.hireDate)}
                        </td>
                        <td className="px-3 py-2 align-middle text-xs">
                          {emp.phone || "-"}
                        </td>
                        <td className="px-3 py-2 align-middle text-xs">
                          {emp.email}
                        </td>
                        <td className="px-3 py-2 align-middle text-right">
                          <Link
                            href={`/employees/${emp.id}`}
                            className="inline-flex items-center rounded-xl border border-bac-border px-3 py-1 text-xs font-medium text-bac-text hover:bg-bac-bg/70"
                          >
                            View / Edit
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
