"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  loadUserSessions,
  loadSessionMessages,
  type ChatSession,
  type ChatMessage,
} from "@/lib/chatHistory";
import { Plus, MessageSquare, Clock, ChevronLeft, ChevronRight } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ChatSidebarProps {
  activeSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (session: ChatSession, messages: ChatMessage[]) => void;
  /** Incrementar para forzar recarga de la lista (ej: cuando se crea una sesión nueva). */
  refreshTrigger?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatSidebar({
  activeSessionId,
  onNewChat,
  onSelectSession,
  refreshTrigger = 0,
}: ChatSidebarProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Carga inicial y cuando cambia refreshTrigger
  useEffect(() => {
    if (!user) return;
    setLoadingSessions(true);
    loadUserSessions(user.uid)
      .then(setSessions)
      .finally(() => setLoadingSessions(false));
  }, [user, refreshTrigger]);

  const handleSelectSession = async (session: ChatSession) => {
    if (session.id === activeSessionId || loadingId) return;
    setLoadingId(session.id);
    const messages = await loadSessionMessages(session.id);
    setLoadingId(null);
    onSelectSession(session, messages);
  };

  return (
    <aside
      className={`
        hidden lg:flex flex-col border-r border-brand-light bg-white shrink-0
        sticky top-16 h-[calc(100vh-4rem)] overflow-hidden
        transition-all duration-300 relative
        ${collapsed ? "w-12" : "w-64"}
      `}
    >
      {/* Toggle collapse */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? "Expandir" : "Colapsar"}
        className="absolute -right-3 top-5 z-10 w-6 h-6 rounded-full bg-white border border-brand-light flex items-center justify-center hover:bg-brand-light transition-colors shadow-sm"
      >
        {collapsed ? (
          <ChevronRight size={12} className="text-brand-dark" />
        ) : (
          <ChevronLeft size={12} className="text-brand-dark" />
        )}
      </button>

      {/* Nueva conversación */}
      <div className="p-3 border-b border-brand-light shrink-0">
        <button
          onClick={onNewChat}
          title="Nueva conversación"
          className={`
            w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-dark text-white
            hover:bg-brand-deepest transition-colors font-medium text-sm
            ${collapsed ? "justify-center" : ""}
          `}
        >
          <Plus size={15} />
          {!collapsed && <span>Nueva conversación</span>}
        </button>
      </div>

      {/* Lista de sesiones */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-2">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 rounded-full border-2 border-brand-light border-t-brand-dark animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-3 gap-2">
              <MessageSquare size={22} className="text-brand-light" />
              <p className="text-xs text-brand-mid leading-relaxed">
                Aún no tienes conversaciones guardadas
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold text-brand-mid uppercase tracking-wider px-2 pt-1 pb-1.5">
                Historial
              </p>
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const isLoading = loadingId === session.id;
                return (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session)}
                    disabled={!!loadingId}
                    className={`
                      w-full text-left px-3 py-2.5 rounded-xl transition-colors
                      ${isActive
                        ? "bg-brand-light text-brand-deepest"
                        : "hover:bg-brand-light/50 text-brand-dark"
                      }
                      ${isLoading ? "opacity-60" : ""}
                    `}
                  >
                    <div className="flex items-start gap-2">
                      {isLoading ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-light border-t-brand-dark animate-spin shrink-0 mt-0.5" />
                      ) : (
                        <MessageSquare
                          size={13}
                          className={`shrink-0 mt-0.5 ${isActive ? "text-brand-dark" : "text-brand-mid"}`}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-snug truncate">
                          {session.title}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock size={9} className="text-brand-mid/50 shrink-0" />
                          <p className="text-[10px] text-brand-mid/60">
                            {formatDate(session.updated_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
