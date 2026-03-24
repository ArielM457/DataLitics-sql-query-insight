import AuthGuard from "@/components/AuthGuard";
import AdminLayout from "@/components/AdminLayout";
import SecurityContent from "@/components/SecurityContent";

export default function SecurityPage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminLayout>
        <SecurityContent />
      </AdminLayout>
    </AuthGuard>
  );
}
