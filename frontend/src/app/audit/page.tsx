import AuthGuard from "@/components/AuthGuard";
import AdminLayout from "@/components/AdminLayout";
import Audit from "@/components/Audit";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import AnalyticsChatbot from "@/components/AnalyticsChatbot";

export default function AuditPage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminLayout>
        <div className="p-8 space-y-6">
          <header>
            <h1 className="text-2xl font-bold text-[#003f54]">Audit Logs</h1>
            <p className="text-[#41484c] text-sm mt-1">Registro de seguridad y actividad de consultas</p>
          </header>
          <Audit />
          <AnalyticsDashboard />
          <AnalyticsChatbot />
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
