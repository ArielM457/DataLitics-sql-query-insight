"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { getUserStatus } from "@/lib/api";
import { Clock, CheckCircle } from "lucide-react";

export default function PendingPage() {
  const router = useRouter();
  const { user, loading, status, refreshProfile } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/"); return; }
    if (status === "active") { router.replace("/home"); return; }
  }, [user, loading, status, router]);

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        // Poll the real backend endpoint for the latest status
        const result = await getUserStatus();
        if (result.status === "approved" || result.status === "active") {
          // Force-refresh the Firebase token to pick up updated claims
          await refreshProfile();
          // The status change will trigger the effect above and redirect to /home
        }
      } catch {
        // silently ignore polling errors
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [user, refreshProfile]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light/30">
      <div className="w-8 h-8 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-brand-light/20">
      <div className="max-w-md w-full text-center space-y-6 animate-fade-in">

        <div className="w-20 h-20 bg-amber-100 border-2 border-amber-200 rounded-2xl flex items-center justify-center mx-auto animate-float">
          <Clock size={36} className="text-amber-600" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-brand-deepest">Solicitud pendiente</h1>
          <p className="text-brand-dark/60 mt-2 leading-relaxed text-sm">
            Tu cuenta fue creada correctamente. Tu administrador debe aprobar tu acceso antes de
            que puedas usar DataLitics.
          </p>
        </div>

        <div className="bg-white border border-brand-light rounded-2xl p-5 text-left space-y-3 shadow-card">
          <p className="text-sm font-semibold text-brand-deepest flex items-center gap-2">
            <Clock size={14} className="text-amber-500" />
            ¿Qué pasa ahora?
          </p>
          <ul className="space-y-2">
            {[
              "El administrador de tu empresa recibirá una notificación.",
              "Una vez aprobado, se te redirigirá automáticamente al chat.",
              "Esta página se actualiza cada 10 segundos.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-brand-dark/70">
                <CheckCircle size={13} className="text-brand-mid shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2 justify-center text-sm text-brand-mid">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          Esperando aprobación...
        </div>

        <button
          onClick={handleLogout}
          className="text-sm text-brand-mid hover:text-brand-dark transition-colors underline"
        >
          Cerrar sesión
        </button>
      </div>
    </main>
  );
}
