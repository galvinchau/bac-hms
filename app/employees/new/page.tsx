"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";

type EmploymentStatus = "Active" | "Inactive" | "On Leave";
type EmploymentType = "Full-time" | "Part-time" | "Per-diem" | "Contract";
type Gender = "Male" | "Female" | "Other" | "";
type ShiftPreference = "Morning" | "Afternoon" | "Evening" | "Overnight" | "";

interface EmployeeFormValues {
  // Demographics
  firstName: string;
  lastName: string;
  middleName: string;
  dateOfBirth: string;
  gender: Gender;
  phone: string;
  email: string;
  educationLevel: string;
  ssn: string;

  // Employment Info
  employeeId: string; // sẽ để trống, backend tự sinh
  role: string;
  status: EmploymentStatus | "";
  hireDate: string;
  terminationDate: string;
  employmentType: EmploymentType;
  branch: string;
  workLocation: string;
  supervisorName: string;

  // Address
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;

  // Emergency Contact
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  emergencyEmail: string;
  emergencyPreferredLanguage: string;
  emergencyAddress: string;

  // Preferences
  preferredShift: ShiftPreference | "";
  canWorkWeekends: boolean;
  canWorkHolidays: boolean;
  maxWeeklyHours: string;
  notes: string;

  // Notification Preferences
  notifyByEmail: boolean;
  notifyBySMS: boolean;
  notifyByInApp: boolean;
  sendScheduleChanges: boolean;
  sendPayrollUpdates: boolean;
  sendPolicyUpdates: boolean;
}

const initialValues: EmployeeFormValues = {
  // Demographics
  firstName: "",
  lastName: "",
  middleName: "",
  dateOfBirth: "",
  gender: "",
  phone: "",
  email: "",
  educationLevel: "",
  ssn: "",

  // Employment Info
  employeeId: "", // để trống, backend sẽ tự sinh
  role: "",
  status: "Active",
  hireDate: "",
  terminationDate: "",
  employmentType: "Full-time",
  branch: "",
  workLocation: "",
  supervisorName: "",

  // Address
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",

  // Emergency Contact
  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",
  emergencyEmail: "",
  emergencyPreferredLanguage: "",
  emergencyAddress: "",

  // Preferences
  preferredShift: "",
  canWorkWeekends: false,
  canWorkHolidays: false,
  maxWeeklyHours: "",
  notes: "",

  // Notification Preferences
  notifyByEmail: true,
  notifyBySMS: false,
  notifyByInApp: true,
  sendScheduleChanges: true,
  sendPayrollUpdates: true,
  sendPolicyUpdates: true,
};

export default function NewEmployeePage() {
  const router = useRouter();
  const [formValues, setFormValues] =
    useState<EmployeeFormValues>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      const res = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formValues),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        console.error("Failed to create employee:", error);
        alert(error?.message || "Failed to create employee.");
        return;
      }

      const created = await res.json();
      console.log("Employee created:", created);
      alert(
        `Employee has been created successfully.\nID: ${created.employeeId}`
      );

      // reset form
      setFormValues(initialValues);
      // hoặc điều hướng tới search:
      // router.push("/employees/search");
    } catch (err) {
      console.error("Unexpected error creating employee:", err);
      alert("Unexpected error while creating employee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-bac-bg text-bac-text">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              New Employee
            </h1>
            <p className="mt-1 text-sm text-bac-muted">
              Create a new employee profile for Blue Angels Care.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-bac-border px-4 py-2 text-sm font-medium text-bac-text hover:bg-bac-panel/70"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="new-employee-form"
              disabled={isSubmitting}
              className="rounded-xl bg-bac-primary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-bac-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save Employee"}
            </button>
          </div>
        </div>

        {/* Form */}
        <form
          id="new-employee-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Demographics */}
          <section className="rounded-2xl border border-bac-border bg-bac-panel p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Demographics</h2>
                <p className="mt-1 text-xs text-bac-muted">
                  Basic personal details for this employee.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* Row 1 */}
              <div className="space-y-1">
                <label
                  htmlFor="firstName"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formValues.firstName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  placeholder="John"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="middleName"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Middle Name
                </label>
                <input
                  id="middleName"
                  name="middleName"
                  type="text"
                  value={formValues.middleName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  placeholder="A."
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="lastName"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formValues.lastName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  placeholder="Doe"
                />
              </div>

              {/* Row 2 */}
              <div className="space-y-1">
                <label
                  htmlFor="dateOfBirth"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Date of Birth
                </label>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={formValues.dateOfBirth}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="gender"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formValues.gender}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="phone"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formValues.phone}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  placeholder="(814) 555-1234"
                />
              </div>

              {/* Row 3: Email | Education | SSN */}
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formValues.email}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  placeholder="name.blueangelscare@gmail.com"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="educationLevel"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Education / Qualification
                </label>
                <select
                  id="educationLevel"
                  name="educationLevel"
                  value={formValues.educationLevel}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                >
                  <option value="">Select education level</option>
                  <option value="High school">High school / GED</option>
                  <option value="College">College / Associate</option>
                  <option value="Bachelor">Bachelor&apos;s degree</option>
                  <option value="Master">Master&apos;s degree</option>
                  <option value="Doctorate">Doctorate</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="ssn"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  SSN (9 digits)
                </label>
                <input
                  id="ssn"
                  name="ssn"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{9}"
                  maxLength={9}
                  value={formValues.ssn}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  placeholder="123456789"
                />
              </div>
            </div>
          </section>

          {/* Employment Info */}
          <section className="rounded-2xl border border-bac-border bg-bac-panel p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Employment Info</h2>
                <p className="mt-1 text-xs text-bac-muted">
                  Role, status, and employment details.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* Row 1: Employee ID - Role - Status */}
              <div className="space-y-1">
                <label
                  htmlFor="employeeId"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Employee ID
                </label>
                <input
                  id="employeeId"
                  name="employeeId"
                  type="text"
                  value={formValues.employeeId}
                  // backend tự sinh, nên không cho nhập
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border border-bac-border bg-bac-bg/60 px-3 py-2 text-sm text-bac-muted outline-none"
                  placeholder="Auto-generated when saving"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="role"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Role / Position
                </label>
                <select
                  id="role"
                  name="role"
                  value={formValues.role}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                >
                  <option value="">Select role</option>
                  <option value="DSP">DSP</option>
                  <option value="Nurse">Nurse</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Admin">Admin</option>
                  <option value="Office Staff">Office Staff</option>
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="status"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formValues.status}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                >
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Row 2: Hire Date - Termination Date - Employment Type */}
              <div className="space-y-1">
                <label
                  htmlFor="hireDate"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Hire Date
                </label>
                <input
                  id="hireDate"
                  name="hireDate"
                  type="date"
                  value={formValues.hireDate}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="terminationDate"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Termination Date
                </label>
                <input
                  id="terminationDate"
                  name="terminationDate"
                  type="date"
                  value={formValues.terminationDate}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="employmentType"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Employment Type
                </label>
                <select
                  id="employmentType"
                  name="employmentType"
                  value={formValues.employmentType}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Per-diem">Per-diem</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>

              {/* Row 3: Branch | Work Location | Supervisor */}
              <div className="space-y-1">
                <label
                  htmlFor="branch"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Branch
                </label>
                <select
                  id="branch"
                  name="branch"
                  value={formValues.branch}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                >
                  <option value="">Select branch</option>
                  <option value="Altoona">Altoona</option>
                  <option value="Hollidaysburg">Hollidaysburg</option>
                  <option value="Bellefonte">Bellefonte</option>
                  <option value="State College">State College</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="workLocation"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Primary Work Location
                </label>
                <input
                  id="workLocation"
                  name="workLocation"
                  type="text"
                  value={formValues.workLocation}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  placeholder="Altoona / Hollidaysburg / In-home services..."
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="supervisorName"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Supervisor
                </label>
                <input
                  id="supervisorName"
                  name="supervisorName"
                  type="text"
                  value={formValues.supervisorName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  placeholder="Name of direct supervisor"
                />
              </div>
            </div>
          </section>

          {/* Address */}
          <section className="rounded-2xl border border-bac-border bg-bac-panel p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Address</h2>
                <p className="mt-1 text-xs text-bac-muted">
                  Home address for this employee.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <label
                  htmlFor="addressLine1"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Address Line 1
                </label>
                <input
                  id="addressLine1"
                  name="addressLine1"
                  type="text"
                  value={formValues.addressLine1}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  placeholder="Street address, PO Box, company name"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label
                  htmlFor="addressLine2"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Address Line 2
                </label>
                <input
                  id="addressLine2"
                  name="addressLine2"
                  type="text"
                  value={formValues.addressLine2}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  placeholder="Apartment, suite, unit, building, floor, etc."
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="city"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  City
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  value={formValues.city}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  placeholder="Altoona"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="state"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  State
                </label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  value={formValues.state}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm uppercase outline-none ring-bac-primary/40 focus:ring"
                  placeholder="PA"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="zipCode"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  ZIP Code
                </label>
                <input
                  id="zipCode"
                  name="zipCode"
                  type="text"
                  value={formValues.zipCode}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  placeholder="16602"
                />
              </div>
            </div>
          </section>

          {/* Emergency Contact */}
          <section className="rounded-2xl border border-bac-border bg-bac-panel p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Emergency Contact</h2>
                <p className="mt-1 text-xs text-bac-muted">
                  Who should we contact in case of an emergency?
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <label
                  htmlFor="emergencyName"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Name
                </label>
                <input
                  id="emergencyName"
                  name="emergencyName"
                  type="text"
                  value={formValues.emergencyName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  placeholder="Contact full name"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="emergencyRelationship"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Relationship
                </label>
                <input
                  id="emergencyRelationship"
                  name="emergencyRelationship"
                  type="text"
                  value={formValues.emergencyRelationship}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  placeholder="Spouse, sibling, friend..."
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="emergencyPhone"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Phone
                </label>
                <input
                  id="emergencyPhone"
                  name="emergencyPhone"
                  type="tel"
                  value={formValues.emergencyPhone}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  placeholder="(814) 555-9876"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label
                  htmlFor="emergencyEmail"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Email
                </label>
                <input
                  id="emergencyEmail"
                  name="emergencyEmail"
                  type="email"
                  value={formValues.emergencyEmail}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  placeholder="name.blueangelscare@gmail.com"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="emergencyPreferredLanguage"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Preferred Language
                </label>
                <select
                  id="emergencyPreferredLanguage"
                  name="emergencyPreferredLanguage"
                  value={formValues.emergencyPreferredLanguage}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                >
                  <option value="">Select language</option>
                  <option value="English">English</option>
                  <option value="Vietnamese">Vietnamese</option>
                  <option value="Spanish">Spanish</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1 md:col-span-3">
                <label
                  htmlFor="emergencyAddress"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Address
                </label>
                <textarea
                  id="emergencyAddress"
                  name="emergencyAddress"
                  value={formValues.emergencyAddress}
                  onChange={handleChange}
                  rows={2}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  placeholder="Emergency contact full address"
                />
              </div>
            </div>
          </section>

          {/* Preferences */}
          <section className="rounded-2xl border border-bac-border bg-bac-panel p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Work Preferences</h2>
                <p className="mt-1 text-xs text-bac-muted">
                  Shift preferences and availability.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <label
                  htmlFor="preferredShift"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Preferred Shift
                </label>
                <select
                  id="preferredShift"
                  name="preferredShift"
                  value={formValues.preferredShift}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                >
                  <option value="">No specific preference</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                  <option value="Overnight">Overnight</option>
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="maxWeeklyHours"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Max Weekly Hours
                </label>
                <input
                  id="maxWeeklyHours"
                  name="maxWeeklyHours"
                  type="number"
                  min={0}
                  value={formValues.maxWeeklyHours}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  placeholder="e.g. 40"
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-bac-muted">
                  Availability
                </span>
                <div className="mt-1 space-y-1 rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-xs">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="canWorkWeekends"
                      checked={formValues.canWorkWeekends}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 rounded border-bac-border bg-bac-bg"
                    />
                    <span>Can work weekends</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="canWorkHolidays"
                      checked={formValues.canWorkHolidays}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 rounded border-bac-border bg-bac-bg"
                    />
                    <span>Can work holidays</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1 md:col-span-3">
                <label
                  htmlFor="notes"
                  className="text-xs font-medium uppercase tracking-wide text-bac-muted"
                >
                  Additional Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formValues.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-xl border border-bac-border bg-bac-bg px-3 py-2 text-sm outline-none ring-bac-primary/40 focus:ring"
                  placeholder="Preferred individuals, locations, restrictions, languages, etc."
                />
              </div>
            </div>
          </section>

          {/* Notification Preferences */}
          <section className="rounded-2xl border border-bac-border bg-bac-panel p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Notification Preferences
                </h2>
                <p className="mt-1 text-xs text-bac-muted">
                  How should we contact this employee about updates?
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-2xl border border-bac-border bg-bac-bg/60 p-4 text-xs">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-bac-muted">
                  Channels
                </p>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="notifyByEmail"
                    checked={formValues.notifyByEmail}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 rounded border-bac-border bg-bac-bg"
                  />
                  <span>Email notifications</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="notifyBySMS"
                    checked={formValues.notifyBySMS}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 rounded border-bac-border bg-bac-bg"
                  />
                  <span>SMS / Text messages</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="notifyByInApp"
                    checked={formValues.notifyByInApp}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 rounded border-bac-border bg-bac-bg"
                  />
                  <span>In-app notifications</span>
                </label>
              </div>

              <div className="space-y-2 rounded-2xl border border-bac-border bg-bac-bg/60 p-4 text-xs">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-bac-muted">
                  Topics
                </p>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="sendScheduleChanges"
                    checked={formValues.sendScheduleChanges}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 rounded border-bac-border bg-bac-bg"
                  />
                  <span>Schedule changes</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="sendPayrollUpdates"
                    checked={formValues.sendPayrollUpdates}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 rounded border-bac-border bg-bac-bg"
                  />
                  <span>Payroll & timesheet updates</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="sendPolicyUpdates"
                    checked={formValues.sendPolicyUpdates}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 rounded border-bac-border bg-bac-bg"
                  />
                  <span>Policy / compliance updates</span>
                </label>
              </div>
            </div>
          </section>

          {/* Bottom actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-bac-border px-4 py-2 text-sm font-medium text-bac-text hover:bg-bac-panel/70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-bac-primary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-bac-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
