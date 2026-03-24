"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  loadUserSessions,
  loadSessionMessages,
  type ChatSession,
  type ChatMessage,
} from "@/lib/chatHistory";
import { Plus, MessageSquare, LogOut, ShieldAlert } from "lucide-react";

function formatDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
}

interface AppSidebarProps {
  activeSessionId?: string | null;
  onNewChat?: () => void;
  onSelectSession?: (session: ChatSession, messages: ChatMessage[]) => void;
  refreshTrigger?: number;
}

export default function AppSidebar({
  activeSessionId,
  onNewChat,
  onSelectSession,
  refreshTrigger = 0,
}: AppSidebarProps) {
  const { user, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoadingSessions(true);
    loadUserSessions(user.uid)
      .then(setSessions)
      .finally(() => setLoadingSessions(false));
  }, [user, refreshTrigger]);

  const handleSessionClick = async (session: ChatSession) => {
    if (loadingId) return;
    if (onSelectSession) {
      if (session.id === activeSessionId) return;
      setLoadingId(session.id);
      const messages = await loadSessionMessages(session.id);
      setLoadingId(null);
      onSelectSession(session, messages);
    } else {
      router.push("/home");
    }
  };

  const handleNewChat = () => {
    onNewChat?.();
    if (pathname !== "/home") router.push("/home");
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() ?? "U";

  const isAdminArea = pathname !== "/home";

  return (
    <aside
      className="fixed left-0 top-0 h-full w-[260px] z-40 flex flex-col py-6 shadow-2xl"
      style={{ background: "linear-gradient(135deg, #003f54 0%, #001e2b 100%)" }}
    >
      {/* Logo */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="bg-white rounded-lg p-1.5 flex-shrink-0">
          <Image
            src="/logo.png"
            alt="DataLitics"
            width={28}
            height={28}
            className="h-7 w-auto object-contain"
          />
        </div>
        <div>
          <h1 className="text-base font-black tracking-widest uppercase text-white">
            DataLitics
          </h1>
          <p className="text-[9px] tracking-widest text-[#9bcde8]/70 uppercase font-bold">
            Enterprise AI
          </p>
        </div>
      </div>

      {/* Nueva consulta */}
      <div className="px-4 mb-6">
        <button
          onClick={handleNewChat}
          className="w-full bg-[#20566d] hover:opacity-90 transition-all text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg group"
        >
          <Plus
            size={18}
            className="group-hover:rotate-90 transition-transform duration-200"
          />
          <span className="text-sm">Nueva consulta</span>
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-2">
        {sessions.length > 0 && (
          <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Recientes
          </p>
        )}
        {loadingSessions ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <MessageSquare size={20} className="text-white/20 mx-auto mb-2" />
            <p className="text-xs text-white/30">Sin conversaciones</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId && !isAdminArea;
              const isLoading = loadingId === session.id;
              return (
                <button
                  key={session.id}
                  onClick={() => handleSessionClick(session)}
                  disabled={!!loadingId}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all hover:translate-x-0.5 ${
                    isActive
                      ? "bg-[#20566d] text-white"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin shrink-0" />
                  ) : (
                    <MessageSquare size={16} className="shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm truncate font-medium">
                      {session.title}
                    </span>
                    <span className="text-[10px] opacity-60">
                      {formatDate(session.updated_at)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

      </div>

      {/* User footer */}
      <div className="mt-auto px-4 pt-4 border-t border-white/10">
        {/* Admin panel link — fijo sobre el usuario, solo para admins */}
        {role === "admin" && (
          <Link
            href="/security"
            className={`px-4 py-3 rounded-lg flex items-center gap-3 transition-all hover:translate-x-0.5 mb-2 ${
              isAdminArea
                ? "bg-[#20566d] text-white"
                : "text-slate-300 hover:bg-white/5"
            }`}
          >
            <ShieldAlert size={18} className="shrink-0" />
            <span className="text-sm font-medium">Panel de Administración</span>
          </Link>
        )}
        <div className="flex items-center gap-3 p-2 mb-3 bg-white/5 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-[#20566d] flex items-center justify-center text-white text-sm font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">
              {user?.displayName || "Usuario"}
            </p>
            <p className="text-[10px] text-[#9bcde8]/70 font-semibold tracking-wider uppercase truncate">
              {role === "admin" ? "Administrador" : "Analista"}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-slate-300 hover:text-white flex items-center gap-3 px-4 py-2 transition-colors rounded-lg hover:bg-white/5"
        >
          <LogOut size={16} />
          <span className="text-sm">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
