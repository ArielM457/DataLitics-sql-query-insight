"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import LoginForm from "@/components/Auth/LoginForm";
import RegisterForm from "@/components/Auth/RegisterForm";
import { MessageCircle, Shield, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: MessageCircle,
    title: "Pregunta en español",
    desc: "¿Cuáles fueron los 10 productos más vendidos este mes?",
  },
  {
    icon: Shield,
    title: "Seguridad incorporada",
    desc: "Prompt Shields bloquean inyecciones y accesos no autorizados.",
  },
  {
    icon: Zap,
    title: "Insights inmediatos",
    desc: "4 agentes en cadena entregan resultados en segundos.",
  },
];

export default function AuthPage() {
  const router = useRouter();
  const { user, loading, status, role } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const initialCheckDone = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (initialCheckDone.current) return;
    initialCheckDone.current = true;
    if (user) {
      if (role === "platform_admin") router.replace("/platform-dashboard");
      else if (status === "pending") router.replace("/pending");
      else router.replace("/home");
    }
  }, [user, loading, status, role, router]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-light/30">
        <div className="w-8 h-8 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Hero izquierdo */}
      <div className="hidden lg:flex flex-col justify-center px-16 bg-brand-gradient relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-dots" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />

        <div className="relative max-w-md animate-fade-in">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white rounded-xl p-2 shadow-lg flex-shrink-0">
              <Image src="/logo.png" alt="DataLitics" width={44} height={44} className="h-11 w-auto object-contain" />
            </div>
            <span className="text-4xl font-extrabold tracking-tight text-white">DataLitics</span>
          </div>
          <p className="text-brand-light/90 text-lg mb-12 leading-relaxed">
            Consulta tus datos empresariales en lenguaje natural. Sin SQL. Sin esperas.
          </p>
          <div className="space-y-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex gap-4 items-start group">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors border border-white/20">
                    <Icon size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{f.title}</p>
                    <p className="text-brand-light/80 text-sm mt-0.5">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Panel de auth */}
      <div className="flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-2">
              <Image src="/logo.png" alt="DataLitics" width={40} height={40} className="h-10 w-auto object-contain" />
              <span className="text-2xl font-extrabold tracking-tight text-brand-deepest">DataLitics</span>
            </div>
            <p className="text-brand-dark/60 text-sm mt-1">Consulta tus datos empresariales</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-brand-light mb-8">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
                  tab === t
                    ? "text-brand-dark"
                    : "text-brand-mid hover:text-brand-dark"
                }`}
              >
                {t === "login" ? "Iniciar sesión" : "Registrarse"}
                {tab === t && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-dark rounded-full" />
                )}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <LoginForm onSwitch={() => setTab("register")} />
          ) : (
            <RegisterForm onSwitch={() => setTab("login")} />
          )}
        </div>
      </div>
    </div>
  );
}
