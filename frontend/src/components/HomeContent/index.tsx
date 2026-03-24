"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Chat, { type Message } from "@/components/Chat";
import AppSidebar from "@/components/AppSidebar";
import { type ChatSession, type ChatMessage } from "@/lib/chatHistory";
import {
  X,
  BookOpen,
  MessageCircle,
  Shield,
  Zap,
  Building2,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  HelpCircle,
} from "lucide-react";

// ─── Sections for right panel ────────────────────────────────────────────────

const PANEL_SECTIONS = [
  {
    icon: MessageCircle,
    title: "Preguntas en lenguaje natural",
    body: "Escribe tus preguntas exactamente como se las harías a un colega. No necesitas saber SQL ni conocer la estructura de tu base de datos.",
    examples: [
      "¿Cuáles fueron los productos más vendidos en Q3?",
      "Dame los clientes que compraron más de 3 veces este mes",
      "¿Cómo van las ventas comparadas con el mes pasado?",
    ],
  },
  {
    icon: Zap,
    title: "Procesamiento inteligente",
    body: "Cada consulta es procesada por un sistema de agentes de IA que trabajan en conjunto: interpretan tu intención, obtienen los datos y los analizan.",
    examples: [],
  },
  {
    icon: BarChart3,
    title: "Resultados e insights",
    body: "Además de los datos, recibirás análisis en lenguaje claro: tendencias, comparativas y recomendaciones accionables.",
    examples: [
      "Resúmenes automáticos de los resultados",
      "Comparativas y tendencias temporales",
    ],
  },
  {
    icon: Shield,
    title: "Seguridad incorporada",
    body: "Cada interacción pasa por múltiples capas de protección. Todo queda registrado en el log de auditoría.",
    examples: [],
  },
  {
    icon: ShieldCheck,
    title: "Acceso según tu rol",
    body: "Cada usuario accede solo a la información que le corresponde. Los datos sensibles se protegen automáticamente.",
    examples: [],
  },
  {
    icon: Building2,
    title: "Tu empresa, tu entorno",
    body: "Los datos de tu organización están completamente aislados de otras empresas en la plataforma.",
    examples: [],
  },
];

// ─── Info Modal ───────────────────────────────────────────────────────────────

function InfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[#003B52]/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#e7eff5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#20566d] flex items-center justify-center">
              <BookOpen size={17} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-[#003f54] text-lg leading-none">
                ¿Qué puedo hacer con DataLitics?
              </h2>
              <p className="text-[#8FAAB4] text-xs mt-0.5">Guía de funcionalidades</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#edf5fb] flex items-center justify-center hover:bg-[#D9E1E7] transition-colors"
          >
            <X size={16} className="text-[#20566d]" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {PANEL_SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="flex gap-4">
                <div className="w-9 h-9 rounded-xl bg-[#edf5fb] flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={17} className="text-[#20566d]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#003f54] mb-1">{s.title}</h3>
                  <p className="text-sm text-[#41484c] leading-relaxed">{s.body}</p>
                  {s.examples.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {s.examples.map((ex) => (
                        <li
                          key={ex}
                          className="flex items-start gap-1.5 text-xs text-[#41484c]/70"
                        >
                          <ChevronRight
                            size={12}
                            className="text-[#8FAAB4] shrink-0 mt-0.5"
                          />
                          {ex}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-6 py-4 border-t border-[#e7eff5] bg-[#edf5fb]/50 rounded-b-3xl">
          <p className="text-xs text-[#8FAAB4] text-center">
            DataLitics · Consulta empresarial con inteligencia artificial
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── HomeContent ──────────────────────────────────────────────────────────────

export default function HomeContent() {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(" ")[0] ?? "de nuevo";

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionTitle, setActiveSessionTitle] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [chatKey, setChatKey] = useState(0);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setActiveSessionTitle(null);
    setInitialMessages([]);
    setChatKey((k) => k + 1);
  };

  const handleSelectSession = (session: ChatSession, messages: ChatMessage[]) => {
    setActiveSessionId(session.id);
    setActiveSessionTitle(session.title);
    setInitialMessages(
      messages.map((m) => ({
        role: m.role,
        content: m.content,
        response: m.response,
      }))
    );
    setChatKey((k) => k + 1);
  };

  const handleSessionCreated = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setSidebarRefresh((r) => r + 1);
  };

  const handleSuggestion = (text: string) => {
    setPendingMessage(text);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#edf5fb]">
      {/* ── Left Sidebar ── */}
      <AppSidebar
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        refreshTrigger={sidebarRefresh}
      />

      {/* ── Main chat area ── */}
      <main
        className={`ml-[260px] flex-1 flex flex-col relative transition-all duration-300 ${rightPanelOpen ? "mr-[300px]" : "mr-0"}`}
        style={{
          backgroundImage:
            "radial-gradient(rgba(0,63,84,0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-8 bg-white/70 backdrop-blur-xl border-b border-[#c0c7cd]/20 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FolderOpen size={18} className="text-[#003f54]" />
              <h2 className="font-bold text-[#003f54] tracking-tight">
                {activeSessionTitle || `Bienvenido, ${firstName}`}
              </h2>
            </div>
            <div className="h-4 w-px bg-[#c0c7cd]/40" />
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Modo Consulta
            </span>
          </div>
        </header>

        {/* Chat — fills remaining height */}
        <div className="flex-1 overflow-hidden">
          <Chat
            key={chatKey}
            sessionId={activeSessionId}
            onSessionCreated={handleSessionCreated}
            initialMessages={initialMessages}
            pendingMessage={pendingMessage}
            onPendingConsumed={() => setPendingMessage(null)}
          />
        </div>
      </main>

      {/* ── Botón flotante para abrir panel (visible solo cuando está cerrado) ── */}
      {!rightPanelOpen && (
        <button
          onClick={() => setRightPanelOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-[#003f54] text-white flex flex-col items-center gap-1.5 px-2 py-4 rounded-l-xl shadow-lg hover:bg-[#20566d] transition-colors"
          title="¿Qué puedo hacer?"
        >
          <HelpCircle size={15} />
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
            ¿Qué puedo hacer?
          </span>
        </button>
      )}

      {/* ── Right info panel ── */}
      <aside
        className={`fixed right-0 top-0 h-full w-[300px] z-30 bg-white border-l border-[#c0c7cd]/20 flex flex-col shadow-sm transition-transform duration-300 ${rightPanelOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="px-5 py-4 border-b border-[#c0c7cd]/20 shrink-0 flex items-center justify-between gap-3">
          <h3 className="font-black text-xs tracking-widest text-[#003f54] uppercase flex items-center gap-2">
            <HelpCircle size={15} />
            ¿Qué puedo hacer?
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#20566d] hover:text-[#003f54] transition-colors"
            >
              <BookOpen size={12} />
              Ver guía
            </button>
            <button
              onClick={() => setRightPanelOpen(false)}
              className="w-6 h-6 rounded-lg bg-[#edf5fb] flex items-center justify-center hover:bg-[#D9E1E7] transition-colors"
              title="Ocultar panel"
            >
              <ChevronRight size={13} className="text-[#20566d]" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {PANEL_SECTIONS.map((s) => {
            const Icon = s.icon;
            const hasExamples = s.examples.length > 0;
            const isExpanded = expandedSections.has(s.title);
            return (
              <div key={s.title} className="rounded-xl overflow-hidden border border-transparent hover:border-[#e7eff5] transition-colors">
                {/* Header — clickable only if has examples */}
                <div
                  className={`flex items-center gap-2 px-2 py-2.5 rounded-xl ${hasExamples ? "cursor-pointer hover:bg-[#edf5fb]" : ""} transition-colors`}
                  onClick={() => hasExamples && toggleSection(s.title)}
                >
                  <div className="w-7 h-7 rounded-lg bg-[#edf5fb] flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-[#003f54]" />
                  </div>
                  <h4 className="text-xs font-bold text-[#003f54] flex-1">{s.title}</h4>
                  {hasExamples && (
                    <ChevronDown
                      size={13}
                      className={`text-[#8FAAB4] transition-transform duration-200 shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                    />
                  )}
                </div>
                {/* Examples — collapsible */}
                {hasExamples && isExpanded && (
                  <div className="space-y-1.5 ml-9 pb-2 pr-2">
                    {s.examples.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => handleSuggestion(ex)}
                        className="w-full text-left text-[11px] font-medium text-slate-600 bg-white border border-slate-100 px-3 py-2 rounded-xl hover:bg-[#003f54] hover:text-white transition-all shadow-sm"
                      >
                        &ldquo;{ex}&rdquo;
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Pro tip card */}
          <div className="bg-[#003f54] rounded-2xl p-5 text-white relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
            <h4 className="text-xs font-bold uppercase tracking-widest mb-2">Tip</h4>
            <p className="text-[11px] leading-relaxed opacity-90">
              Usa palabras como &ldquo;comparar con&rdquo; o &ldquo;mostrar tendencia&rdquo; para activar el motor de visualización automático.
            </p>
          </div>

        </div>

        <div className="p-6 border-t border-[#c0c7cd]/20 shrink-0">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Sistemas conectados
          </div>
        </div>
      </aside>

      {modalOpen && <InfoModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
