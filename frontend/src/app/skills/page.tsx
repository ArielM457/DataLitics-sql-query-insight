"use client";

import { useState, useCallback, Suspense } from "react";
import AuthGuard from "@/components/AuthGuard";
import AdminLayout from "@/components/AdminLayout";
import SkillsInventory from "@/components/SkillsInventory";
import SkillsChatbot from "@/components/SkillsChatbot";
import ConversationsPanel from "@/components/ConversationsPanel";
import { useSearchParams } from "next/navigation";

function SkillsContent() {
  const searchParams = useSearchParams();
  const activeConvId = searchParams.get("conv") ?? undefined;
  const [panelKey, setPanelKey] = useState(0);

  const handleSaved = useCallback(() => {
    setPanelKey((k) => k + 1);
  }, []);

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#003f54]">Skills del Sistema</h1>
        <p className="text-[#41484c] text-sm mt-1">
          Inventario de habilidades de los agentes y recomendaciones basadas en los logs
        </p>
      </header>
      <SkillsInventory />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SkillsChatbot onConversationSaved={handleSaved} />
        </div>
        <div>
          <ConversationsPanel key={panelKey} activeConvId={activeConvId} />
        </div>
      </div>
    </div>
  );
}

export default function SkillsPage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminLayout>
        <Suspense>
          <SkillsContent />
        </Suspense>
      </AdminLayout>
    </AuthGuard>
  );
}
