// app/admin/user-roles/page.tsx
import { prisma } from "@/lib/prisma";

export default async function ManageUserRolesPage() {
  // Lấy danh sách roles từ DB
  const roles = await prisma.role.findMany({
    orderBy: { code: "asc" },
    include: {
      users: true, // để đếm xem có bao nhiêu user đang dùng role này
    },
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage User Roles</h1>
        {/* Sau này mình có thể thêm nút "Create Role" ở đây */}
      </div>

      <p className="text-sm text-bac-muted">
        Roles determine the high-level access level for each user (e.g. ADMIN,
        COORDINATOR, DSP). This screen is read-only for now.
      </p>

      <div className="rounded-xl border border-bac-border bg-bac-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/20 text-xs uppercase text-bac-muted">
            <tr>
              <th className="px-4 py-2 text-left">Code</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Description</th>
              <th className="px-4 py-2 text-right"># Users</th>
            </tr>
          </thead>
          <tbody>
            {roles.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-4 text-center text-xs text-bac-muted"
                >
                  No roles defined.
                </td>
              </tr>
            )}

            {roles.map((role) => (
              <tr
                key={role.id}
                className="border-t border-bac-border/50 hover:bg-white/5"
              >
                <td className="px-4 py-2 align-top font-mono text-xs">
                  {role.code}
                </td>
                <td className="px-4 py-2 align-top">{role.name}</td>
                <td className="px-4 py-2 align-top text-xs text-bac-muted">
                  {role.description || "-"}
                </td>
                <td className="px-4 py-2 align-top text-right text-xs">
                  {role.users.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-bac-muted">
        Note: Roles are linked to users via the Admin &gt; Manage Users screen.
      </p>
    </div>
  );
}
