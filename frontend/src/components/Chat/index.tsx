"use client";

import { useState, useEffect, useRef } from "react";
import { queryAgent } from "@/lib/api";
import { Send, Bot, User, Code2, Table2, Lightbulb } from "lucide-react";

interface AgentResponse {
  sql?: string;
  explanation?: string;
  data?: Record<string, unknown>[];
  insights?: Record<string, unknown>;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  response?: AgentResponse;
}

interface ChatProps {
  /** Mensaje externo a enviar automáticamente (ej: desde sugerencias). Se consume una vez. */
  pendingMessage?: string | null;
  onPendingConsumed?: () => void;
}

function DataTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data || data.length === 0) return null;
  const columns = Object.keys(data[0]);
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-brand-light">
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr className="bg-brand-light">
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 font-semibold text-brand-deepest text-left whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 50).map((row, i) => (
            <tr key={i} className="border-t border-brand-light/50 odd:bg-white even:bg-brand-light/20 hover:bg-brand-light/40 transition-colors">
              {columns.map((col) => (
                <td key={col} className="px-3 py-1.5 text-brand-deepest/80">
                  {String(row[col] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 50 && (
        <p className="text-xs text-brand-mid px-3 py-1.5 bg-brand-light/20 border-t border-brand-light">
          Mostrando 50 de {data.length} filas.
        </p>
      )}
    </div>
  );
}

function AssistantMessage({ msg }: { msg: Message }) {
  const r = msg.response;
  return (
    <div className="bg-white border border-brand-light text-brand-deepest mr-8 p-4 rounded-2xl rounded-tl-sm space-y-3 shadow-card animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-brand-dark flex items-center justify-center">
          <Bot size={13} className="text-white" />
        </div>
        <p className="text-xs font-semibold text-brand-dark">DataAgent</p>
      </div>

      {msg.content && <p className="text-sm text-brand-deepest leading-relaxed">{msg.content}</p>}

      {r?.sql && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Code2 size={12} className="text-brand-mid" />
            <p className="text-xs font-semibold text-brand-mid uppercase tracking-wide">SQL Generado</p>
          </div>
          <pre className="bg-brand-deepest text-green-400 text-xs rounded-xl p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {r.sql}
          </pre>
        </div>
      )}

      {r?.data && r.data.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Table2 size={12} className="text-brand-mid" />
            <p className="text-xs font-semibold text-brand-mid uppercase tracking-wide">
              Resultados ({r.data.length} filas)
            </p>
          </div>
          <DataTable data={r.data} />
        </div>
      )}

      {r?.insights && Object.keys(r.insights).length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Lightbulb size={12} className="text-brand-mid" />
            <p className="text-xs font-semibold text-brand-mid uppercase tracking-wide">Insights</p>
          </div>
          <div className="bg-brand-light/40 border border-brand-light rounded-xl p-3 text-sm text-brand-deepest space-y-1">
            {Object.entries(r.insights).map(([k, v]) => (
              <p key={k}>
                <span className="font-medium capitalize">{k.replace(/_/g, " ")}:</span>{" "}
                {String(v)}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Chat({ pendingMessage, onPendingConsumed }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Enviar mensaje externo cuando llega desde sugerencias
  useEffect(() => {
    if (pendingMessage && !loading) {
      handleSendText(pendingMessage);
      onPendingConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMessage]);

  const handleSendText = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response: AgentResponse = await queryAgent(text);
      const assistantMessage: Message = {
        role: "assistant",
        content: response?.explanation || "Consulta procesada correctamente.",
        response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error al procesar tu pregunta. Por favor intenta de nuevo." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => handleSendText(input);

  return (
    <div className="border border-brand-light rounded-2xl bg-white h-[600px] flex flex-col shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-brand-light bg-brand-light/20 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-brand-dark flex items-center justify-center">
          <Bot size={16} className="text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-brand-deepest">DataAgent</h2>
          <p className="text-xs text-brand-mid">Consulta tus datos en lenguaje natural</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center animate-float">
              <Bot size={26} className="text-brand-dark" />
            </div>
            <p className="text-brand-mid text-sm max-w-xs">
              Haz una pregunta sobre tus datos. Por ejemplo:{" "}
              <span className="text-brand-dark font-medium italic">
                &quot;¿Cuáles fueron los productos más vendidos este mes?&quot;
              </span>
            </p>
          </div>
        )}
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="flex justify-end animate-fade-in">
              <div className="bg-brand-dark text-white ml-8 p-3 rounded-2xl rounded-tr-sm max-w-[85%]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                    <User size={11} className="text-white" />
                  </div>
                  <p className="text-xs font-semibold text-brand-light/80">Tú</p>
                </div>
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ) : (
            <AssistantMessage key={i} msg={msg} />
          )
        )}
        {loading && (
          <div className="bg-white border border-brand-light p-4 rounded-2xl rounded-tl-sm mr-8 shadow-card">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-brand-dark flex items-center justify-center">
                <Bot size={13} className="text-white" />
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-brand-mid rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-brand-light bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Haz una pregunta sobre tus datos..."
            className="flex-1 border border-brand-light rounded-xl px-4 py-2.5 text-brand-deepest placeholder:text-brand-mid/70 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand-dark transition-all text-sm bg-brand-light/20"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-brand-dark text-white px-4 py-2.5 rounded-xl hover:bg-brand-deepest disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium text-sm"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
