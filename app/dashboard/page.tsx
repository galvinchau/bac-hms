// app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold">Dashboard</div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-bac-border p-4 bg-bac-bg">
          <div className="text-sm text-bac-muted">Total Patients</div>
          <div className="text-2xl font-semibold mt-1">187</div>
        </div>
        <div className="rounded-xl border border-bac-border p-4 bg-bac-bg">
          <div className="text-sm text-bac-muted">Operation Staff</div>
          <div className="text-2xl font-semibold mt-1">45</div>
        </div>
        <div className="rounded-xl border border-bac-border p-4 bg-bac-bg">
          <div className="text-sm text-bac-muted">Today’s Shifts</div>
          <div className="text-2xl font-semibold mt-1">28</div>
        </div>
        <div className="rounded-xl border border-bac-border p-4 bg-bac-bg">
          <div className="text-sm text-bac-muted">This Month’s Revenue</div>
          <div className="text-2xl font-semibold mt-1">$58,000</div>
        </div>
      </div>

      <div className="rounded-xl border border-bac-border p-4 bg-bac-bg">
        <div className="text-sm font-medium mb-2">Recent Activity</div>
        <div className="text-sm text-bac-muted space-y-1">
          <div>
            10:30 AM — Employee John Doe checked in shift —{" "}
            <span className="text-green-400">Complete</span>
          </div>
          <div>
            9:45 PM — Newly created payment request —{" "}
            <span className="text-yellow-400">Processing</span>
          </div>
          <div>
            9:15 PM — Warning: CPR certification about to expire —{" "}
            <span className="text-red-400">Alert</span>
          </div>
        </div>
      </div>
    </div>
  );
}
