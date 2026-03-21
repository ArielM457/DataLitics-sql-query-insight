import AuthGuard from "@/components/AuthGuard";
import Audit from "@/components/Audit";

export default function AuditPage() {
  return (
    <AuthGuard requiredRole="admin">
      <main className="p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-gray-500 text-sm">Registro de seguridad y actividad de consultas</p>
        </header>
        <Audit />
      </main>
    </AuthGuard>
  );
}
