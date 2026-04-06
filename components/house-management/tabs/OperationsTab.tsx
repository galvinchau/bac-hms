"use client";

import React from "react";
import {
  AppointmentRow,
  MealRow,
  MedTaskRow,
  ChoreRow,
  SpecialistVisitRow,
  SectionCard,
  StatCard,
  Badge,
  NoteBox,
} from "../shared";

export default function OperationsTab({
  selectedHouseName,
  meals,
  meds,
  chores,
  appointments,
  specialists,
}: {
  selectedHouseName: string;
  meals: MealRow[];
  meds: MedTaskRow[];
  chores: ChoreRow[];
  appointments: AppointmentRow[];
  specialists: SpecialistVisitRow[];
}) {
  return (
    <div className="space-y-4">
      <SectionCard
        title={`Daily Operations — ${selectedHouseName}`}
        subtitle="Meals, medication, laundry, appointments, specialist visits, behavior support, and daily residential care."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <StatCard label="Meals Logged" value="1 / 4" tone="warning" />
          <StatCard label="Medication Tasks" value={meds.length} tone="success" />
          <StatCard label="House Chores" value={chores.length} tone="sky" />
          <StatCard label="Appointments" value={appointments.length} tone="violet" />
          <StatCard label="Specialist Visits" value={specialists.length} tone="warning" />
          <StatCard label="Open Incidents" value={1} tone="danger" />
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <SectionCard
          title="Meals"
          subtitle="Meal service, feeding support, and kitchen coordination."
          className="xl:col-span-4"
        >
          <div className="space-y-3">
            {meals.map((m) => (
              <div key={m.meal} className="rounded-2xl border border-bac-border bg-bac-bg p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-bac-text">{m.meal}</div>
                  <Badge variant="muted">{m.completion}</Badge>
                </div>
                <div className="mt-2 text-sm text-bac-muted">Served by: {m.servedBy}</div>
                <div className="mt-2 text-sm text-bac-muted">{m.notes}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Medication"
          subtitle="Most residential individuals use medication daily, often multiple times."
          className="xl:col-span-4"
        >
          <div className="space-y-3">
            {meds.map((m, index) => (
              <div
                key={`${m.resident}-${index}`}
                className="rounded-2xl border border-bac-border bg-bac-bg p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-bac-text">{m.resident}</div>
                  {m.status === "DONE" ? (
                    <Badge variant="success">Done</Badge>
                  ) : m.status === "PENDING" ? (
                    <Badge variant="warning">Pending</Badge>
                  ) : (
                    <Badge variant="danger">Refused</Badge>
                  )}
                </div>
                <div className="mt-2 text-sm text-bac-muted">Schedule: {m.schedule}</div>
                <div className="mt-2 text-sm text-bac-muted">{m.notes}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Laundry / Housekeeping"
          subtitle="Daily living support including laundry and home tasks."
          className="xl:col-span-4"
        >
          <div className="space-y-3">
            {chores.map((c, index) => (
              <div
                key={`${c.task}-${index}`}
                className="rounded-2xl border border-bac-border bg-bac-bg p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-bac-text">{c.task}</div>
                  {c.status === "DONE" ? (
                    <Badge variant="success">Done</Badge>
                  ) : (
                    <Badge variant="warning">Pending</Badge>
                  )}
                </div>
                <div className="mt-2 text-sm text-bac-muted">Assigned to: {c.assignedTo}</div>
                <div className="mt-2 text-sm text-bac-muted">{c.notes}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <SectionCard
          title="Appointments"
          subtitle="Ongoing doctor visits and follow-up coordination."
          className="xl:col-span-5"
        >
          <div className="space-y-3">
            {appointments.map((a, index) => (
              <div
                key={`${a.resident}-${index}`}
                className="rounded-2xl border border-bac-border bg-bac-bg p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-bac-text">{a.resident}</div>
                  {a.status === "SCHEDULED" ? (
                    <Badge variant="warning">Scheduled</Badge>
                  ) : a.status === "COMPLETED" ? (
                    <Badge variant="success">Completed</Badge>
                  ) : (
                    <Badge variant="violet">Follow-up</Badge>
                  )}
                </div>
                <div className="mt-2 text-sm text-bac-muted">
                  {a.appointmentType} • {a.when}
                </div>
                <div className="mt-2 text-sm text-bac-muted">Escort: {a.escort}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Behavior Specialist Visits"
          subtitle="In-home specialist support for behavior management and staff coaching."
          className="xl:col-span-3"
        >
          <div className="space-y-3">
            {specialists.map((s, index) => (
              <div
                key={`${s.resident}-${index}`}
                className="rounded-2xl border border-bac-border bg-bac-bg p-4"
              >
                <div className="text-sm font-medium text-bac-text">{s.resident}</div>
                <div className="mt-1 text-sm text-bac-muted">{s.specialist}</div>
                <div className="mt-2 text-sm text-bac-muted">{s.focus}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-bac-muted">{s.when}</span>
                  {s.status === "DONE" ? (
                    <Badge variant="success">Done</Badge>
                  ) : (
                    <Badge variant="warning">Upcoming</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Daily Notes / Behavior"
          subtitle="Shift notes, behavior observations, and care summary."
          className="xl:col-span-4"
        >
          <div className="space-y-3">
            <NoteBox
              title="Morning shift note"
              meta="Anna Smith • 09:45 AM"
              body="Residents completed breakfast and medication with moderate prompts. Laundry started. One resident prepared for specialist behavior visit."
            />
            <NoteBox
              title="Behavior support note"
              meta="Behavior Specialist • 11:50 AM"
              body="Observed transition difficulty before medication. Staff coaching provided on de-escalation and cueing."
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}