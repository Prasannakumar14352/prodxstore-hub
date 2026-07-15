import { RequireAdmin } from "@/components/admin/require-admin.tsx";
import { AdminContent } from "./page.tsx";

export default function AdminDashboardPage() {
  return (
    <RequireAdmin>
      <AdminContent />
    </RequireAdmin>
  );
}
