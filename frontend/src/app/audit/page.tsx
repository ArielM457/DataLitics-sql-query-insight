"use client";

import { useState, useCallback, Suspense } from "react";
import AuthGuard from "@/components/AuthGuard";
import AdminLayout from "@/components/AdminLayout";
import Audit from "@/components/Audit";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import AnalyticsChatbot from "@/components/AnalyticsChatbot";
import ConversationsPanel from "@/components/ConversationsPanel";
import { useSearchParams } from "next/navigation";

function AuditContent() {
  const searchParams = useSearchParams();
  const activeConvId = searchParams.get("conv") ?? undefined;
  const [panelKey, setPanelKey] = useState(0);

  const handleSaved = useCallback(() => {
    setPanelKey((k) => k + 1);
  }, []);

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#003f54]">Audit Logs</h1>
        <p className="text-[#41484c] text-sm mt-1">Registro de seguridad y actividad de consultas</p>
      </header>
      <Audit />
      <AnalyticsDashboard />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnalyticsChatbot onConversationSaved={handleSaved} />
        </div>
        <div>
          <ConversationsPanel key={panelKey} activeConvId={activeConvId} />
        </div>
      </div>
    </div>
  );
}

export default function AuditPage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminLayout>
        <Suspense>
          <AuditContent />
        </Suspense>
      </AdminLayout>
    </AuthGuard>
  );
}
