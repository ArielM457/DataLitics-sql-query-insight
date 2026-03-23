import AuthGuard from "@/components/AuthGuard";
import AdminLayout from "@/components/AdminLayout";
import Onboarding from "@/components/Onboarding";

export default function OnboardingPage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminLayout>
        <div className="p-8 max-w-4xl mx-auto">
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-[#003f54]">Base de datos</h1>
            <p className="text-[#41484c] text-sm mt-1">
              Actualiza la cadena de conexión de la base de datos de tu empresa.
            </p>
          </header>
          <Onboarding />
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
