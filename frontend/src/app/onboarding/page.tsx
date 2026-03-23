import AuthGuard from "@/components/AuthGuard";
import AdminLayout from "@/components/AdminLayout";
import Onboarding from "@/components/Onboarding";

export default function OnboardingPage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminLayout>
        <div className="px-8 py-6 max-w-5xl mx-auto">
          <Onboarding />
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
