"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  MessageCircle,
  Shield,
  Zap,
  Building2,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

const BENEFITS = [
  {
    icon: MessageCircle,
    title: "Lenguaje natural",
    desc: "Haz preguntas como '¿Cuáles fueron los productos más vendidos este mes?' y obtén respuestas al instante.",
  },
  {
    icon: Shield,
    title: "Seguridad con IA",
    desc: "Prompt Shields y circuit breakers bloquean inyecciones SQL y accesos no autorizados automáticamente.",
  },
  {
    icon: Zap,
    title: "Pipeline multi-agente",
    desc: "4 agentes en cadena: intención → SQL → ejecución → insights. Todo en segundos.",
  },
  {
    icon: Building2,
    title: "Multi-tenant",
    desc: "Cada empresa tiene su propio entorno aislado. Tus datos nunca se mezclan con los de otras organizaciones.",
  },
  {
    icon: BarChart3,
    title: "Insights automáticos",
    desc: "No solo resultados — el agente explica tendencias, anomalías y recomendaciones accionables.",
  },
  {
    icon: ShieldCheck,
    title: "Roles y permisos",
    desc: "Controla qué columnas y tablas puede ver cada rol. Datos sensibles protegidos por defecto.",
  },
];

const STEPS = [
  { step: "1", title: "Conecta tu empresa", desc: "Vincula tu base de datos de Azure SQL. DataLitics la inspecciona y configura el entorno en minutos." },
  { step: "2", title: "Invita a tu equipo", desc: "Genera códigos de acceso para cada colaborador. Tú controlas quién puede ver qué." },
  { step: "3", title: "Pregunta en español", desc: "Tu equipo hace preguntas en lenguaje natural y recibe resultados, SQL generado e insights al instante." },
];

export default function LandingPage() {
  const { user, loading, status, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      if (status === "pending") router.replace("/pending");
      else router.replace("/home");
    }
  }, [user, loading, status, role, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-light/30">
        <div className="w-8 h-8 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-gradient text-white py-28 px-6">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10 bg-dots" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

        <div className="relative max-w-4xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-white/10 text-brand-light text-sm font-medium px-4 py-1.5 rounded-full mb-8 border border-white/20">
            <Zap size={14} />
            Potenciado por Azure OpenAI + GPT-4o
          </div>
          <h1 className="text-5xl font-bold mb-6 leading-tight tracking-tight">
            Consulta tus datos empresariales
            <br />
            <span className="text-brand-light">sin escribir una línea de SQL</span>
          </h1>
          <p className="text-brand-light/90 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
            DataLitics conecta tu base de datos y la pone a disposición de tu equipo mediante
            preguntas en lenguaje natural, con seguridad empresarial incorporada.
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 bg-white text-brand-dark font-bold px-10 py-4 rounded-xl text-lg hover:bg-brand-light transition-all shadow-brand hover:shadow-brand-lg hover:-translate-y-0.5 duration-200"
          >
            Únete a DataLitics
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-3xl font-bold text-brand-deepest mb-4">
              Todo lo que necesitas, sin la complejidad
            </h2>
            <p className="text-brand-dark/70 max-w-xl mx-auto leading-relaxed">
              DataLitics combina inteligencia artificial, seguridad de nivel empresarial y
              facilidad de uso en una sola plataforma.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.title}
                  className="group p-6 rounded-2xl border border-brand-light bg-white card-hover shadow-card"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-light flex items-center justify-center mb-4 group-hover:bg-brand-dark/10 transition-colors">
                    <Icon size={22} className="text-brand-dark" />
                  </div>
                  <h3 className="font-semibold text-brand-deepest mb-2">{b.title}</h3>
                  <p className="text-brand-dark/70 text-sm leading-relaxed">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-24 px-6 bg-brand-light/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-brand-deepest mb-16">Cómo funciona</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {STEPS.map((item, idx) => (
              <div key={item.step} className="relative flex flex-col items-center">
                {idx < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(50%+24px)] w-full h-0.5 bg-brand-mid/40" />
                )}
                <div className="w-12 h-12 rounded-full bg-brand-gradient text-white font-bold text-lg flex items-center justify-center mb-4 shadow-brand z-10">
                  {item.step}
                </div>
                <h3 className="font-semibold text-brand-deepest mb-2">{item.title}</h3>
                <p className="text-brand-dark/70 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="py-8 px-6 bg-white border-y border-brand-light">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-6 text-sm text-brand-dark/60">
          {["Azure OpenAI", "GPT-4o", "Azure Container Apps", "Firebase Auth", "LangGraph"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-brand-dark" />
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="py-24 px-6 bg-brand-gradient text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-dots" />
        <div className="relative max-w-xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">¿Listo para empezar?</h2>
          <p className="text-brand-light/90 mb-10 leading-relaxed">
            Únete hoy y conecta la primera base de datos de tu empresa en minutos.
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 bg-white text-brand-dark font-bold px-10 py-4 rounded-xl text-lg hover:bg-brand-light transition-all shadow-brand hover:-translate-y-0.5 duration-200"
          >
            Crear cuenta
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-brand-deepest text-brand-mid text-sm text-center">
        <p>© 2026 DataLitics · Hackathon Microsoft Azure</p>
      </footer>
    </div>
  );
}
