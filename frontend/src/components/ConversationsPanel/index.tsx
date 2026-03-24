"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getRecentConversations, ConversationMeta } from "@/lib/api";
import { History, Bot, Sparkles, Loader2, ChevronRight, RefreshCw } from "lucide-react";

const TYPE_CONFIG = {
  analytics_chat: {
    label: "Auditoría",
    icon: Bot,
    badge: "bg-indigo-100 text-indigo-700",
    href: "/audit",
  },
  skills_chat: {
    label: "Skills",
    icon: Sparkles,
    badge: "bg-violet-100 text-violet-700",
    href: "/skills",
  },
} as const;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hace un momento";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export default function ConversationsPanel({ activeConvId }: { activeConvId?: string }) {
  const router = useRouter();
  const [convs, setConvs] = useState<ConversationMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setConvs(await getRecentConversations());
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleClick = (conv: ConversationMeta) => {
    const cfg = TYPE_CONFIG[conv.type];
    router.push(`${cfg.href}?conv=${conv.id}`);
  };

  return (
    <div className="border border-brand-light rounded-2xl bg-white shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-brand-light bg-brand-light/20">
        <div className="flex items-center gap-2">
          <History size={18} className="text-brand-dark" />
          <h2 className="text-lg font-semibold text-brand-deepest">Conversaciones recientes</h2>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-brand-dark border border-brand-light px-3 py-1.5 rounded-lg hover:bg-brand-light/40 transition-all"
        >
          <RefreshCw size={12} />
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-brand-dark">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Cargando...</span>
        </div>
      ) : convs.length === 0 ? (
        <div className="py-8 text-center text-sm text-brand-mid">
          No hay conversaciones guardadas aún.
        </div>
      ) : (
        <div className="divide-y divide-brand-light/50 max-h-72 overflow-y-auto">
          {convs.map((conv) => {
            const cfg = TYPE_CONFIG[conv.type];
            const Icon = cfg.icon;
            const isActive = conv.id === activeConvId;
            return (
              <button
                key={conv.id}
                onClick={() => handleClick(conv)}
                className={`w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-brand-light/20 transition-colors group ${
                  isActive ? "bg-brand-light/30" : ""
                }`}
              >
                <div className="shrink-0 w-8 h-8 rounded-full bg-brand-light/60 flex items-center justify-center">
                  <Icon size={14} className="text-brand-dark" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-brand-dark/50">{timeAgo(conv.created_at)}</span>
                    <span className="text-xs text-brand-dark/40">· {conv.message_count} msgs</span>
                  </div>
                  <p className="text-sm text-brand-deepest truncate">{conv.preview}</p>
                </div>
                <ChevronRight size={14} className="text-brand-dark/30 shrink-0 group-hover:text-brand-dark transition-colors" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
