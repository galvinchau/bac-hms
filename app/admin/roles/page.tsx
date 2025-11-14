// app/admin/roles/page.tsx
import { redirect } from "next/navigation";

export default function AdminRolesRedirectPage() {
  // Redirect vĩnh viễn từ /admin/roles sang /admin/user-roles
  redirect("/admin/user-roles");
}
