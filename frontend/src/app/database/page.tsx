import AuthGuard from "@/components/AuthGuard";
import AdminLayout from "@/components/AdminLayout";
import DatabaseManagement from "@/components/DatabaseManagement";

export default function DatabasePage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminLayout>
        <DatabaseManagement />
      </AdminLayout>
    </AuthGuard>
  );
}
