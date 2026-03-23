"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Chat, { type Message } from "@/components/Chat";
import ChatSidebar from "@/components/ChatSidebar";
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
  Sparkles,
} from "lucide-react";

// ─── Modal "Saber más" ────────────────────────────────────────────────────────

const MODAL_SECTIONS = [
  {
    icon: MessageCircle,
    title: "Preguntas en lenguaje natural",
    body: "Escribe tus preguntas exactamente como se las harías a un colega. No necesitas saber SQL ni conocer la estructura de tu base de datos — DataLitics entiende el contexto y obtiene la información por ti.",
    examples: [
      "¿Cuáles fueron los productos más vendidos en Q3?",
      "Dame los clientes que compraron más de 3 veces este mes",
      "¿Cómo van las ventas comparadas con el mes pasado?",
    ],
  },
  {
    icon: Zap,
    title: "Procesamiento inteligente",
    body: "Cada consulta es procesada por un sistema de agentes de inteligencia artificial que trabajan en conjunto: interpretan tu intención, obtienen los datos correctos y los analizan — todo de forma automática y en segundos.",
    examples: [],
  },
  {
    icon: BarChart3,
    title: "Resultados e insights",
    body: "Además de los datos, recibirás un análisis en lenguaje claro: tendencias, comparativas con períodos anteriores, valores atípicos y recomendaciones. No solo qué pasó, sino qué significa.",
    examples: [
      "Resúmenes automáticos de los resultados",
      "Comparativas y tendencias temporales",
    ],
  },
  {
    icon: Shield,
    title: "Seguridad incorporada",
    body: "Cada interacción pasa por múltiples capas de protección que detectan y bloquean consultas maliciosas, accesos no autorizados y cualquier intento de obtener información fuera de tu alcance. Todo queda registrado en el log de auditoría.",
    examples: [
      "Protección automática ante consultas maliciosas",
      "Registro de auditoría de cada interacción",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Acceso según tu rol",
    body: "Cada usuario accede solo a la información que le corresponde. Los administradores configuran qué datos puede ver cada persona, y los datos sensibles se protegen de forma automática sin ninguna configuración extra.",
    examples: [],
  },
  {
    icon: Building2,
    title: "Tu empresa, tu entorno",
    body: "Los datos de tu organización están completamente aislados. Nadie externo — ni otras empresas que usen la plataforma — puede acceder a tu información. Cada empresa opera en su propio espacio seguro.",
    examples: [],
  },
];

function InfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-brand-deepest/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-brand-lg w-full max-w-2xl max-h-[85vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-light">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-dark flex items-center justify-center">
              <BookOpen size={17} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-brand-deepest text-lg leading-none">¿Qué puedo hacer con DataLitics?</h2>
              <p className="text-brand-mid text-xs mt-0.5">Guía de funcionalidades</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-brand-light flex items-center justify-center hover:bg-brand-mid/30 transition-colors"
          >
            <X size={16} className="text-brand-dark" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {MODAL_SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="flex gap-4">
                <div className="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={17} className="text-brand-dark" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-brand-deepest mb-1">{s.title}</h3>
                  <p className="text-sm text-brand-dark/70 leading-relaxed">{s.body}</p>
                  {s.examples.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {s.examples.map((ex) => (
                        <li key={ex} className="flex items-start gap-1.5 text-xs text-brand-dark/60">
                          <ChevronRight size={12} className="text-brand-mid shrink-0 mt-0.5" />
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
        <div className="px-6 py-4 border-t border-brand-light bg-brand-light/20 rounded-b-3xl">
          <p className="text-xs text-brand-mid text-center">
            DataLitics · Consulta empresarial con inteligencia artificial
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── InfoPanel ────────────────────────────────────────────────────────────────

function InfoPanel() {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <div className="border border-brand-light rounded-2xl bg-white shadow-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-brand-dark" />
          <h2 className="font-semibold text-brand-deepest text-sm">¿Qué puedo preguntar?</h2>
        </div>
        <p className="text-sm text-brand-dark/70 leading-relaxed">
          Escribe cualquier pregunta sobre los datos de tu empresa en español.
          DataLitics la procesa de forma segura y te devuelve resultados claros
          con análisis incluido — sin necesitar conocimientos técnicos.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { icon: Shield, label: "Seguridad IA" },
            { icon: Zap, label: "Agentes IA" },
            { icon: BarChart3, label: "Insights auto" },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1 bg-brand-light text-brand-deepest px-2.5 py-1 rounded-lg font-medium">
              <Icon size={11} />
              {label}
            </span>
          ))}
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 text-sm font-semibold text-brand-dark hover:text-brand-deepest transition-colors group"
        >
          <BookOpen size={15} />
          Saber más
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
      {modalOpen && <InfoModal onClose={() => setModalOpen(false)} />}
    </>
  );
}

// ─── HomeContent ──────────────────────────────────────────────────────────────

export default function HomeContent() {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(" ")[0] ?? "de nuevo";

  // Sesión activa y mensajes iniciales para cargar conversaciones anteriores
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  // chatKey: incrementar fuerza el remount de Chat (reset de estado interno)
  const [chatKey, setChatKey] = useState(0);
  // sidebarRefresh: incrementar recarga la lista del sidebar
  const [sidebarRefresh, setSidebarRefresh] = useState(0);

  const handleNewChat = () => {
    setActiveSessionId(null);
    setInitialMessages([]);
    setChatKey((k) => k + 1);
  };

  const handleSelectSession = (session: ChatSession, messages: ChatMessage[]) => {
    setActiveSessionId(session.id);
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
    // Recargar sidebar para mostrar la nueva conversación
    setSidebarRefresh((r) => r + 1);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar de historial */}
      <ChatSidebar
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        refreshTrigger={sidebarRefresh}
      />

      {/* Contenido principal */}
      <main className="flex-1 p-6 min-w-0 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand-deepest">
            Bienvenido, {firstName}
          </h1>
          <p className="text-brand-dark/60 text-sm mt-1">
            Haz una pregunta sobre tus datos y DataLitics se encarga del resto.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
          <Chat
            key={chatKey}
            sessionId={activeSessionId}
            onSessionCreated={handleSessionCreated}
            initialMessages={initialMessages}
          />
          <InfoPanel />
        </div>
      </main>
    </div>
  );
}
