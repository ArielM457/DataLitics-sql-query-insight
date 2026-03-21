import AuthGuard from "@/components/AuthGuard";
import Onboarding from "@/components/Onboarding";

export default function OnboardingPage() {
  return (
    <AuthGuard requiredRole="admin">
      <main className="p-6 max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-brand-deepest">Base de datos</h1>
          <p className="text-brand-dark/60 text-sm mt-1">
            Actualiza la cadena de conexión de la base de datos de tu empresa.
          </p>
        </header>
        <Onboarding />
      </main>
    </AuthGuard>
  );
}
