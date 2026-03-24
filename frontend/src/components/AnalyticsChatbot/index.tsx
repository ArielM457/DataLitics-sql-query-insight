"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { analyticsChat, saveConversation, getConversation } from "@/lib/api";
import { renderMarkdown } from "@/lib/renderMarkdown";
import { Bot, Send, Loader2, User, AlertCircle, Plus } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hola, soy el analista de logs. Puedo responder preguntas sobre las consultas registradas, patrones de uso, errores frecuentes y más. ¿En qué te puedo ayudar?",
};

interface Props {
  onConversationSaved?: () => void;
}

export default function AnalyticsChatbot({ onConversationSaved }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [activeConvId, setActiveConvId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Restore conversation from URL param
  const convId = searchParams.get("conv");
  useEffect(() => {
    if (!convId) return;
    setRestoring(true);
    getConversation(convId)
      .then((conv) => {
        if (conv.type === "analytics_chat") {
          setMessages(conv.messages as Message[]);
          setActiveConvId(conv.id);
        }
      })
      .catch(() => {})
      .finally(() => setRestoring(false));
  }, [convId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const hasUserMessages = messages.some((m) => m.role === "user");

  // Auto-save after every assistant reply
  const autoSave = useCallback(async (msgs: Message[], currentConvId: string | undefined) => {
    const preview = msgs.find((m) => m.role === "user")?.content ?? "";
    try {
      const saved = await saveConversation("analytics_chat", msgs, preview, currentConvId);
      setActiveConvId(saved.id);
      onConversationSaved?.();
    } catch {
      // non-blocking
    }
  }, [onConversationSaved]);

  const handleNewConversation = useCallback(() => {
    setMessages([WELCOME]);
    setActiveConvId(undefined);
    setInput("");
    setError(null);
    router.replace("/audit");
  }, [router]);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setError(null);
    const next: Message[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setLoading(true);

    try {
      const data = await analyticsChat(question, 200);
      const withReply: Message[] = [...next, { role: "assistant", content: data.answer }];
      setMessages(withReply);
      // Auto-save immediately after reply
      await autoSave(withReply, activeConvId);
    } catch {
      setError("No se pudo obtener respuesta. Verifica la conexión con el backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-brand-light rounded-2xl bg-white shadow-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-brand-light bg-brand-light/20">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-brand-dark" />
          <div>
            <h2 className="text-lg font-semibold text-brand-deepest leading-tight">Analista de Logs</h2>
            <p className="text-xs text-brand-dark/70">Pregunta sobre patrones, errores o actividad reciente</p>
          </div>
        </div>
        {hasUserMessages && (
          <button
            onClick={handleNewConversation}
            className="flex items-center gap-1.5 text-xs border border-brand-light px-3 py-1.5 rounded-lg text-brand-dark hover:bg-brand-light/40 transition-all"
          >
            <Plus size={12} />
            Nueva consulta
          </button>
        )}
      </div>

      {restoring && (
        <div className="flex items-center gap-2 px-5 py-3 text-sm text-brand-dark bg-brand-light/20">
          <Loader2 size={14} className="animate-spin" />
          Restaurando conversación...
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 max-h-[420px]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="shrink-0 w-7 h-7 rounded-full bg-brand-dark flex items-center justify-center">
                <Bot size={14} className="text-white" />
              </div>
            )}
            <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.role === "user"
                ? "bg-brand-dark text-white rounded-tr-sm"
                : "bg-brand-light/40 text-brand-deepest rounded-tl-sm"
            }`}>
              {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
            </div>
            {msg.role === "user" && (
              <div className="shrink-0 w-7 h-7 rounded-full bg-brand-light flex items-center justify-center">
                <User size={14} className="text-brand-dark" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="shrink-0 w-7 h-7 rounded-full bg-brand-dark flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-brand-light/40 rounded-2xl rounded-tl-sm px-4 py-2.5">
              <Loader2 size={16} className="animate-spin text-brand-dark" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mx-5 mb-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <AlertCircle size={13} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="px-5 pb-4 pt-2 border-t border-brand-light/50 flex gap-2 items-end">
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ej: ¿Cuáles son los errores más frecuentes esta semana?"
          className="flex-1 resize-none border border-brand-light rounded-xl px-3 py-2 text-sm text-brand-deepest placeholder:text-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-dark/20 bg-white max-h-28 overflow-y-auto"
          style={{ lineHeight: "1.5" }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="shrink-0 bg-brand-dark text-white p-2.5 rounded-xl hover:bg-brand-deepest disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Enviar"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
