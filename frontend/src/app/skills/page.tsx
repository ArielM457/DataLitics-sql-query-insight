import AuthGuard from "@/components/AuthGuard";
import AdminLayout from "@/components/AdminLayout";
import SkillsInventory from "@/components/SkillsInventory";
import SkillsChatbot from "@/components/SkillsChatbot";

export default function SkillsPage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminLayout>
        <div className="p-8 space-y-6">
          <header>
            <h1 className="text-2xl font-bold text-[#003f54]">Skills del Sistema</h1>
            <p className="text-[#41484c] text-sm mt-1">
              Inventario de habilidades de los agentes y recomendaciones basadas en los logs
            </p>
          </header>
          <SkillsInventory />
          <SkillsChatbot />
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
