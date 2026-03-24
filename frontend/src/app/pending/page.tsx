"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { getUserStatus } from "@/lib/api";
import { Bell, Settings, Clock, ArrowRight } from "lucide-react";

export default function PendingPage() {
  const router = useRouter();
  const { user, loading, status, tenantId, refreshProfile } = useAuth();

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

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?";

  if (loading) return (
    <div className="bg-mesh min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="bg-mesh min-h-screen flex flex-col text-[#151d21]">

      {/* Header */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-[#003f54]/10 shadow-sm fixed top-0 z-50 flex justify-between items-center w-full px-6 h-16">
        <div className="text-xl font-bold tracking-tighter text-[#003f54]">
          DataLitics
        </div>
        <div className="flex items-center gap-1">
          <button className="text-slate-500 hover:text-[#003f54] transition-colors p-2 rounded-full hover:bg-slate-50">
            <Bell size={20} />
          </button>
          <button className="text-slate-500 hover:text-[#003f54] transition-colors p-2 rounded-full hover:bg-slate-50">
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 pt-16 pb-20">
        <div className="w-full max-w-2xl text-center space-y-12">

          {/* Hourglass icon */}
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 bg-[#003f54]/5 rounded-full blur-3xl scale-150" />
            <div className="relative bg-white shadow-xl rounded-full p-8 border border-[#c0c7cd]/20">
              <Clock size={64} className="text-[#003f54]" />
            </div>
          </div>

          {/* Title & subtitle */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black text-[#003f54] tracking-tight leading-tight">
              Tu cuenta está pendiente de aprobación
            </h1>
            <p className="text-lg md:text-xl text-[#36637c] font-medium max-w-lg mx-auto leading-relaxed">
              Un administrador revisará tu solicitud pronto
            </p>
          </div>

          {/* User card + pulse */}
          <div className="flex flex-col items-center gap-6">
            <div className="glass-card rounded-2xl p-6 w-full max-w-sm text-left shadow-lg space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-[#20566d] flex items-center justify-center text-white text-sm font-bold overflow-hidden shadow-inner shrink-0">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#003f54] tracking-tight">
                    {user?.displayName ?? "Usuario"}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">{user?.email}</p>
                </div>
              </div>
              {tenantId && (
                <div className="pt-3 border-t border-[#003f54]/5 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Empresa</span>
                  <span className="text-xs font-semibold text-[#003f54]">{tenantId}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-1.5 items-center">
                <div className="w-2 h-2 rounded-full bg-[#003f54] dot-pulse" />
                <div className="w-2 h-2 rounded-full bg-[#003f54] dot-pulse" style={{ animationDelay: "0.2s" }} />
                <div className="w-2 h-2 rounded-full bg-[#003f54] dot-pulse" style={{ animationDelay: "0.4s" }} />
              </div>
              <p className="text-xs font-bold text-[#003f54]/60 tracking-widest uppercase">
                Verificando estado automáticamente...
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 flex flex-col items-center gap-4">
        <div className="w-16 h-1 bg-[#003f54]/10 rounded-full" />
        <div className="flex flex-col md:flex-row items-center gap-2 text-sm text-slate-500">
          <span>¿Necesitas ayuda inmediata?</span>
          <a
            href="mailto:support@datalitics.com"
            className="text-[#003f54] font-bold hover:underline transition-all flex items-center gap-1 group"
          >
            Contactar a soporte
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-slate-400 hover:text-[#003f54] transition-colors underline"
        >
          Cerrar sesión
        </button>
        <p className="text-[10px] text-slate-400 font-medium tracking-tight">
          © 2024 DATALITICS ENTERPRISE AI. TODOS LOS DERECHOS RESERVADOS.
        </p>
      </footer>

    </div>
  );
}
