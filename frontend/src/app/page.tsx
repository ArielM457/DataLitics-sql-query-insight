"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import {
  MessageSquare,
  ShieldCheck,
  Building2,
  ArrowRight,
  Check,
  TrendingUp,
  BarChart3,
  Globe,
  Share2,
} from "lucide-react";

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Consultas en lenguaje natural",
    desc: "Habla con tus datos. Nuestra IA interpreta preguntas complejas y genera visualizaciones automáticas sin una sola línea de código.",
  },
  {
    icon: ShieldCheck,
    title: "Seguridad y cumplimiento",
    desc: "Encriptación de extremo a extremo y cumplimiento con estándares internacionales. Tus datos nunca salen de tu control total.",
  },
  {
    icon: Building2,
    title: "Empresa multi-tenant",
    desc: "Arquitectura escalable diseñada para grandes organizaciones. Gestión granular de permisos y segregación total de datos.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Conecta tu base de datos",
    desc: "Soportamos Azure SQL, PostgreSQL y MySQL con un solo clic.",
  },
  {
    step: "2",
    title: "Pregunta en lenguaje natural",
    desc: "Escribe tus dudas como si hablaras con un analista experto.",
  },
  {
    step: "3",
    title: "Obtén insights instantáneos",
    desc: "Recibe gráficos dinámicos y reportes listos para exportar.",
  },
];

const BENEFITS = [
  {
    title: "Reducción de latencia analítica",
    desc: "Elimina el cuello de botella en el departamento de IT para consultas simples.",
  },
  {
    title: "Democratización de la información",
    desc: "Permite que cualquier miembro del equipo tome decisiones basadas en datos reales.",
  },
  {
    title: "Escalabilidad de consultas",
    desc: "Gestiona miles de peticiones concurrentes sin degradar el rendimiento.",
  },
];

const BAR_HEIGHTS = [40, 70, 55, 90, 75, 100];

export default function LandingPage() {
  const { user, loading, status, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      if (role === "platform_admin") router.replace("/platform-dashboard");
      else if (status === "pending") router.replace("/pending");
      else router.replace("/home");
    }
  }, [user, loading, status, role, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4faff]">
        <div className="w-8 h-8 border-2 border-[#003f54] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#f4faff] text-[#151d21] antialiased"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Navbar (white, sticky) ── */}
      <nav className="fixed top-0 z-50 w-full bg-white border-b border-[#c0c7cd]/30 shadow-sm flex justify-between items-center px-6 h-16">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="DataLitics"
            width={44}
            height={44}
            className="h-11 w-auto object-contain"
            priority
          />
          <span className="text-xl font-extrabold tracking-tight text-[#003f54]">DataLitics</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
          <a className="hover:text-[#003f54] transition-colors" href="#features">
            Características
          </a>
          <a className="hover:text-[#003f54] transition-colors" href="#security">
            Seguridad
          </a>
          <a className="hover:text-[#003f54] transition-colors" href="#how">
            Cómo funciona
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/auth"
            className="text-sm font-medium text-[#003f54] px-4 py-2 hover:bg-slate-50 transition-colors rounded-lg"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/auth"
            className="bg-[#003f54] text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all"
          >
            Prueba gratuita
          </Link>
        </div>
      </nav>

      <main className="pt-16">
        {/* ── Hero ── */}
        <section className="relative min-h-[calc(100vh-64px)] flex items-center py-16 overflow-hidden bg-gradient-to-br from-[#003f54] via-[#003f54] to-[#20566d]">
          <div className="absolute inset-0 bg-dots opacity-30 pointer-events-none" />
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-[#9fcce9]/10 rounded-full blur-[120px]" />

          <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            {/* Left copy */}
            <div className="max-w-2xl">
              <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-[#c0e8ff] text-xs font-bold tracking-[0.1em] uppercase mb-6 backdrop-blur-md">
                AI-POWERED ANALYTICS
              </span>
              <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter leading-[1.1] mb-6">
                Transforma tus datos en{" "}
                <span className="text-[#9bcde8]">insights</span> en segundos
              </h1>
              <p className="text-lg md:text-xl text-[#98cae5] mb-10 leading-relaxed font-light">
                Consulta tu base de datos en lenguaje natural con IA. Olvida el
                SQL complejo y obtén respuestas directas de tu infraestructura
                de datos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/auth"
                  className="bg-[#20566d] text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:shadow-2xl hover:-translate-y-1 transition-all"
                >
                  Comenzar gratis
                  <ArrowRight size={20} />
                </Link>
                <button className="border border-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all backdrop-blur-sm">
                  Ver demo
                </button>
              </div>
            </div>

            {/* Right: decorative analytics widget */}
            <div className="relative hidden lg:block">
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#20566d]/30 rounded-full blur-[100px]" />
              <div
                className="relative z-10 rounded-2xl p-6 overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {/* Fake window chrome */}
                <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                  <span className="text-xs text-white/40 ml-4 font-mono">
                    analytics_query.sql
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-[#9bcde8] text-sm mb-2 font-mono">
                      Pregunta:
                    </p>
                    <p className="text-white">
                      "¿Cuál fue el crecimiento de ingresos por región este
                      trimestre?"
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "LATAM", value: "+24.5%" },
                      { label: "EMEA", value: "+18.2%" },
                    ].map((r) => (
                      <div
                        key={r.label}
                        className="p-4 rounded-lg border border-white/5"
                        style={{ background: "rgba(0,63,84,0.4)" }}
                      >
                        <p className="text-xs text-[#98cae5] uppercase tracking-widest mb-1">
                          {r.label}
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {r.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Mini bar chart */}
                  <div className="h-32 w-full flex items-end gap-2 px-2 pb-2">
                    {BAR_HEIGHTS.map((h, i) => (
                      <div
                        key={i}
                        className="w-full rounded-t-sm"
                        style={{
                          height: `${h}%`,
                          background: i % 2 === 0 ? "#c0e8ff" : "#9bcde8",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mb-20">
              <h2 className="text-4xl font-extrabold tracking-tight text-[#003f54] mb-6">
                Poder analítico para cada equipo
              </h2>
              <p className="text-lg text-[#41484c] font-light">
                Diseñado para ser intuitivo pero construido sobre una
                infraestructura de grado empresarial.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="group">
                    <div className="w-14 h-14 bg-[#edf5fb] rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                      <Icon size={28} className="text-[#003f54]" />
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-[#151d21]">
                      {f.title}
                    </h3>
                    <p className="text-[#41484c] leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how" className="py-24 bg-[#edf5fb]">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-20">
              <h2 className="text-3xl font-extrabold tracking-tight text-[#003f54] mb-4">
                Cómo funciona
              </h2>
              <p className="text-[#41484c]">
                Del despliegue al insight en tres pasos críticos.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-[#c0c7cd]/30 -translate-y-1/2 hidden md:block" />
              {STEPS.map((s) => (
                <div
                  key={s.step}
                  className="relative bg-white p-10 rounded-2xl shadow-sm border border-[#c0c7cd]/10 text-center"
                >
                  <div className="w-12 h-12 bg-[#003f54] text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-6 relative z-10">
                    {s.step}
                  </div>
                  <h4 className="text-lg font-bold mb-2 text-[#151d21]">
                    {s.title}
                  </h4>
                  <p className="text-sm text-[#41484c]">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Benefits ── */}
        <section id="security" className="py-24 bg-[#D9E1E7]">
          <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-extrabold tracking-tight text-[#003f54] mb-8 leading-tight">
                Beneficios que impulsan tu crecimiento empresarial
              </h2>
              <ul className="space-y-6">
                {BENEFITS.map((b) => (
                  <li key={b.title} className="flex items-start gap-4">
                    <div className="mt-1 bg-[#003f54]/10 rounded-full p-1 shrink-0">
                      <Check size={18} className="text-[#003f54]" />
                    </div>
                    <div>
                      <h5 className="font-bold text-[#003f54]">{b.title}</h5>
                      <p className="text-[#41484c] text-sm">{b.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stats card */}
            <div className="relative">
              <div className="bg-white rounded-3xl shadow-2xl p-8 border border-[#c0c7cd]/20">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 size={32} className="text-[#20566d]" />
                  <div>
                    <p className="text-xs font-bold text-[#71787d] uppercase tracking-widest">
                      Eficiencia operativa
                    </p>
                    <p className="text-3xl font-black text-[#003f54]">+80%</p>
                  </div>
                </div>
                <p className="text-sm text-[#41484c] mb-6">
                  Ahorro de tiempo en generación de reportes analíticos
                </p>
                <div className="space-y-3">
                  {[
                    { label: "Velocidad de consultas", pct: 95 },
                    { label: "Satisfacción del equipo", pct: 88 },
                    { label: "Reducción de errores", pct: 76 },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="flex justify-between text-xs font-medium text-[#41484c] mb-1">
                        <span>{m.label}</span>
                        <span>{m.pct}%</span>
                      </div>
                      <div className="h-2 bg-[#edf5fb] rounded-full">
                        <div
                          className="h-2 bg-[#20566d] rounded-full transition-all"
                          style={{ width: `${m.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-[#003f54] text-white p-4 rounded-2xl shadow-xl flex items-center gap-2">
                <TrendingUp size={20} />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#9bcde8]">
                    Ahorro tiempo
                  </p>
                  <p className="text-xl font-black">+80%</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section className="py-24">
          <div className="container mx-auto px-6">
            <div className="relative rounded-3xl overflow-hidden bg-[#003B52] py-20 px-8 text-center border border-white/10">
              <div className="absolute inset-0 bg-dots opacity-10 pointer-events-none" />
              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-8">
                  ¿Listo para empezar?
                </h2>
                <p className="text-[#9bcde8] mb-10 text-lg font-light">
                  Únete a cientos de empresas que ya están extrayendo valor real
                  de sus datos.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/auth"
                    className="bg-[#20566d] text-white px-10 py-5 rounded-xl font-bold text-lg shadow-lg hover:scale-105 transition-transform inline-flex items-center justify-center gap-2"
                  >
                    Crear mi cuenta gratis
                    <ArrowRight size={20} />
                  </Link>
                  <button className="bg-transparent border border-white/20 text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white/5 transition-colors">
                    Hablar con ventas
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#f4faff] py-12 border-t border-[#e7eff5]">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="DataLitics"
                width={36}
                height={36}
                className="h-9 w-auto object-contain"
              />
              <span className="text-lg font-extrabold tracking-tight text-[#003f54]">DataLitics</span>
            </div>
            <p className="text-xs text-[#71787d] font-medium">
              Enterprise AI Solutions © 2026
            </p>
          </div>

          <div className="flex gap-8 text-sm font-medium text-[#41484c]">
            <a className="hover:text-[#003f54] transition-colors" href="#">
              Términos
            </a>
            <a className="hover:text-[#003f54] transition-colors" href="#">
              Privacidad
            </a>
            <a className="hover:text-[#003f54] transition-colors" href="#">
              Contacto
            </a>
          </div>

          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e7eff5] flex items-center justify-center text-[#003f54] cursor-pointer hover:bg-[#20566d] hover:text-white transition-all">
              <Globe size={18} />
            </div>
            <div className="w-10 h-10 rounded-full bg-[#e7eff5] flex items-center justify-center text-[#003f54] cursor-pointer hover:bg-[#20566d] hover:text-white transition-all">
              <Share2 size={18} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
