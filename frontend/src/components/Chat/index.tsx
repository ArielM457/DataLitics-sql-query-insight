"use client";

import { useState, useEffect, useRef } from "react";
import { queryAgent, clarifyQuery, type ClarifyQuestion } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  createChatSession,
  addMessageToSession,
  logQueryRequest,
  type AgentResponse,
} from "@/lib/chatHistory";
import {
  Send,
  Bot,
  User,
  Code2,
  Table2,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Download,
  Copy,
  Check,
  Info,
  X,
  Zap,
  BrainCircuit,
} from "lucide-react";
import ChartDisplay from "@/components/ChartDisplay";

// ─── localStorage keys ────────────────────────────────────────────────────────

const LS_MODE = "datalitics_mode";
const LS_HINT_DISMISSED = "datalitics_extended_hint_dismissed";
const LS_POPUP_SEEN = "datalitics_extended_popup_seen";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Message {
  role: "user" | "assistant";
  content: string;
  response?: AgentResponse;
  clarificationData?: {
    questions: ClarifyQuestion[];
    sessionKey: string;
  };
}

interface ChatProps {
  pendingMessage?: string | null;
  onPendingConsumed?: () => void;
  sessionId?: string | null;
  onSessionCreated?: (sessionId: string) => void;
  initialMessages?: Message[];
}

// ─── DataTable ────────────────────────────────────────────────────────────────

function DataTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data || data.length === 0) return null;
  const columns = Object.keys(data[0]);
  return (
    <div className="mt-3 max-w-full rounded-lg border border-brand-light overflow-x-auto" style={{ maxHeight: "260px" }}>
      <table className="text-xs border-collapse" style={{ minWidth: "max-content" }}>
        <thead>
          <tr className="bg-brand-light">
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 font-semibold text-brand-deepest text-left whitespace-nowrap sticky top-0 bg-brand-light">
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

// ─── Export Helpers ────────────────────────────────────────────────────────────

function downloadCSV(data: Record<string, unknown>[], filename = "datos") {
  if (!data.length) return;
  const columns = Object.keys(data[0]);
  const header = columns.join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = String(row[col] ?? "");
        return val.includes(",") || val.includes('"') || val.includes("\n")
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      })
      .join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-brand-light/50 text-brand-mid hover:bg-brand-light hover:text-brand-dark transition-all"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copiado" : label}
    </button>
  );
}

// Keys que se manejan con componentes dedicados, no como texto plano
const SKIP_INSIGHT_KEYS = new Set(["chart_type", "chart_config", "chart_justification"]);

// ─── FloatingModeHint ─────────────────────────────────────────────────────────

function FloatingModeHint({
  onDismiss,
  onTryExtended,
}: {
  onDismiss: () => void;
  onTryExtended: () => void;
}) {
  return (
    <div className="absolute right-4 top-14 z-30 animate-fade-in">
      {/* Arrow pointing up */}
      <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[7px] border-l-transparent border-r-transparent border-b-brand-dark ml-auto mr-10" />
      <div className="relative bg-brand-dark text-white rounded-xl px-3 pt-2.5 pb-2 shadow-lg max-w-[190px]">
        <button
          onClick={onDismiss}
          className="absolute top-1.5 right-1.5 text-white/50 hover:text-white transition-colors"
        >
          <X size={11} />
        </button>
        <p className="text-xs font-medium leading-snug pr-4">
          <span className="text-yellow-300">✨</span> Prueba el{" "}
          <strong>Modo Extendido</strong> para análisis más precisos
        </p>
        <button
          onClick={onTryExtended}
          className="mt-1.5 text-[11px] underline text-white/70 hover:text-white transition-colors"
        >
          Activar ahora →
        </button>
      </div>
    </div>
  );
}

// ─── ExtendedModeModal ────────────────────────────────────────────────────────

function ExtendedModeModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-brand-deepest text-base flex items-center gap-2">
            <BrainCircuit size={18} className="text-brand-dark" />
            Modo Extendido
          </h3>
          <button
            onClick={onClose}
            className="text-brand-mid hover:text-brand-deepest transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-brand-deepest/80 mb-4 leading-relaxed">
          Antes de ejecutar tu consulta, el agente te hará{" "}
          <strong>2-3 preguntas rápidas</strong> para entender exactamente lo
          que necesitas y darte un análisis más preciso.
        </p>

        {/* Steps */}
        <div className="space-y-3 mb-4">
          <p className="text-[11px] font-semibold text-brand-mid uppercase tracking-wide">
            Cómo funciona
          </p>
          {[
            {
              icon: "✍️",
              title: "Escribe tu pregunta",
              desc: "En lenguaje natural, como siempre",
            },
            {
              icon: "👆",
              title: "Responde con un click",
              desc: "Sí / No o elige entre opciones concretas",
            },
            {
              icon: "🎯",
              title: "Análisis más preciso",
              desc: "El agente usa tu contexto para generar mejores resultados",
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex gap-3 items-start">
              <span className="text-base leading-none mt-0.5">{icon}</span>
              <div>
                <p className="text-sm font-medium text-brand-deepest">{title}</p>
                <p className="text-xs text-brand-mid leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="bg-brand-light/50 rounded-xl p-3 mb-4">
          <p className="text-[11px] font-semibold text-brand-mid uppercase tracking-wide mb-2">
            Tips
          </p>
          <ul className="space-y-1 text-xs text-brand-deepest/80">
            <li>• Responde haciendo click — sin necesidad de escribir</li>
            <li>• Máximo 3 preguntas por consulta</li>
            <li>• Las preguntas se adaptan al idioma que uses</li>
            <li>• Puedes volver al Modo Rápido cuando quieras</li>
          </ul>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-brand-dark text-white py-2 rounded-xl text-sm font-medium hover:bg-brand-deepest transition-all"
        >
          ¡Entendido!
        </button>
      </div>
    </div>
  );
}

// ─── ModeToggle ───────────────────────────────────────────────────────────────

function ModeToggle({
  mode,
  onEasy,
  onExtended,
  onInfoClick,
}: {
  mode: "easy" | "extended";
  onEasy: () => void;
  onExtended: () => void;
  onInfoClick: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5 bg-brand-light rounded-lg p-0.5">
        <button
          onClick={onEasy}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            mode === "easy"
              ? "bg-white text-brand-deepest shadow-sm"
              : "text-brand-mid hover:text-brand-deepest"
          }`}
        >
          <Zap size={11} />
          Rápido
        </button>
        <button
          onClick={onExtended}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            mode === "extended"
              ? "bg-brand-dark text-white shadow-sm"
              : "text-brand-mid hover:text-brand-deepest"
          }`}
        >
          <BrainCircuit size={11} />
          Extendido
        </button>
      </div>
      {mode === "extended" && (
        <button
          onClick={onInfoClick}
          className="w-5 h-5 flex items-center justify-center rounded-full bg-brand-light text-brand-mid hover:text-brand-dark hover:bg-brand-light/80 transition-colors"
          title="¿Cómo funciona el Modo Extendido?"
        >
          <Info size={11} />
        </button>
      )}
    </div>
  );
}

// ─── ClarificationBubble ──────────────────────────────────────────────────────

function ClarificationBubble({
  questions,
  onComplete,
}: {
  questions: ClarifyQuestion[];
  onComplete: (answers: Record<string, string>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleAnswer = (questionId: string, answer: string) => {
    // Already answered — ignore
    if (answers[questionId]) return;

    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    // Auto-proceed when all questions answered
    if (Object.keys(newAnswers).length === questions.length) {
      onComplete(newAnswers);
    }
  };

  const remaining = questions.length - Object.keys(answers).length;

  return (
    <div className="bg-white border border-brand-light text-brand-deepest mr-8 p-4 rounded-2xl rounded-tl-sm space-y-3 shadow-card animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-brand-dark flex items-center justify-center">
          <Bot size={13} className="text-white" />
        </div>
        <p className="text-xs font-semibold text-brand-dark">DataAgent</p>
        <span className="text-[10px] bg-brand-dark/10 text-brand-dark px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
          <BrainCircuit size={9} />
          Modo Extendido
        </span>
      </div>

      <p className="text-sm text-brand-deepest/80">
        Para darte un análisis más preciso, necesito un poco más de contexto:
      </p>

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((q) => {
          const answered = Boolean(answers[q.id]);
          const answer = answers[q.id];

          return (
            <div
              key={q.id}
              className={`rounded-xl p-3 border transition-all ${
                answered
                  ? "bg-brand-light/30 border-brand-light"
                  : "bg-white border-brand-light/60"
              }`}
            >
              <p className="text-sm font-medium text-brand-deepest mb-2">
                {q.text}
              </p>

              {q.type === "yes_no" ? (
                <div className="flex gap-2">
                  {["Sí", "No"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(q.id, opt)}
                      disabled={answered}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        answer === opt
                          ? "bg-brand-dark text-white"
                          : answered
                          ? "bg-brand-light/50 text-brand-mid/50 cursor-not-allowed"
                          : "bg-brand-light text-brand-deepest hover:bg-brand-dark hover:text-white"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(q.options || []).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(q.id, opt)}
                      disabled={answered}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        answer === opt
                          ? "bg-brand-dark text-white"
                          : answered
                          ? "bg-brand-light/50 text-brand-mid/50 cursor-not-allowed"
                          : "bg-brand-light text-brand-deepest hover:bg-brand-dark hover:text-white"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {remaining > 0 && (
        <p className="text-xs text-brand-mid">
          {remaining} pregunta{remaining !== 1 ? "s" : ""} pendiente
          {remaining !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

// ─── AssistantMessage ─────────────────────────────────────────────────────────

function AssistantMessage({
  msg,
  onClarificationComplete,
}: {
  msg: Message;
  onClarificationComplete?: (
    sessionKey: string,
    answers: Record<string, string>,
    questions: ClarifyQuestion[]
  ) => void;
}) {
  // Clarification bubble — renders instead of normal message
  if (msg.clarificationData) {
    return (
      <ClarificationBubble
        questions={msg.clarificationData.questions}
        onComplete={(answers) =>
          onClarificationComplete?.(
            msg.clarificationData!.sessionKey,
            answers,
            msg.clarificationData!.questions
          )
        }
      />
    );
  }

  const r = msg.response;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [sqlOpen, setSqlOpen] = useState(false);

  const insights = r?.insights as Record<string, unknown> | undefined;
  const chartType = insights?.chart_type as string | undefined;
  const chartConfig = insights?.chart_config as Record<string, unknown> | undefined;
  const chartJustification = insights?.chart_justification as string | undefined;

  return (
    <div className="bg-white border border-brand-light text-brand-deepest mr-8 p-4 rounded-2xl rounded-tl-sm space-y-3 shadow-card animate-fade-in overflow-hidden min-w-0 w-full">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-brand-dark flex items-center justify-center">
          <Bot size={13} className="text-white" />
        </div>
        <p className="text-xs font-semibold text-brand-dark">DataAgent</p>
      </div>

      {msg.content && (
        <p className="text-sm text-brand-deepest leading-relaxed break-words">
          {msg.content}
        </p>
      )}

      {/* SQL — colapsable con botón copiar */}
      {r?.sql && (
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSqlOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-mid uppercase tracking-wide hover:text-brand-dark transition-colors"
            >
              <Code2 size={12} />
              <span>Consulta técnica</span>
              {sqlOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {sqlOpen && <CopyButton text={r.sql} label="Copiar SQL" />}
          </div>
          {sqlOpen && (
            <pre className="mt-1.5 bg-brand-deepest text-green-400 text-xs rounded-xl p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {r.sql}
            </pre>
          )}
        </div>
      )}

      {/* Tabla de datos */}
      {r?.data && r.data.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Table2 size={12} className="text-brand-mid" />
              <p className="text-xs font-semibold text-brand-mid uppercase tracking-wide">
                Resultados ({r.data.length} filas)
              </p>
            </div>
            <button
              onClick={() => downloadCSV(r.data!)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-brand-light/50 text-brand-mid hover:bg-brand-light hover:text-brand-dark transition-all"
            >
              <Download size={11} />
              CSV
            </button>
          </div>
          <DataTable data={r.data} />
        </div>
      )}

      {/* Gráfica */}
      {chartType &&
        chartType !== "table" &&
        (chartConfig?.labels as unknown[])?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <BarChart2 size={12} className="text-brand-mid" />
              <p className="text-xs font-semibold text-brand-mid uppercase tracking-wide">
                Visualización
              </p>
            </div>
            <ChartDisplay
              chartType={chartType}
              chartConfig={
                chartConfig as Parameters<typeof ChartDisplay>[0]["chartConfig"]
              }
              justification={chartJustification}
            />
          </div>
        )}

      {/* Insights de texto */}
      {insights && Object.keys(insights).length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Lightbulb size={12} className="text-brand-mid" />
            <p className="text-xs font-semibold text-brand-mid uppercase tracking-wide">
              Insights
            </p>
          </div>
          <div className="bg-brand-light/40 border border-brand-light rounded-xl p-3 text-sm text-brand-deepest space-y-2">
            {Object.entries(insights).map(([k, v]) => {
              if (SKIP_INSIGHT_KEYS.has(k)) return null;
              const label = k.replace(/_/g, " ");
              if (Array.isArray(v)) {
                return (
                  <div key={k}>
                    <p className="font-medium capitalize mb-0.5">{label}:</p>
                    <ul className="list-disc list-inside space-y-0.5 pl-1">
                      {(v as unknown[]).map((item, i) => (
                        <li key={i} className="text-brand-deepest/80">
                          {String(item)}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }
              if (k === "source" && typeof v === "object" && v !== null) {
                const s = v as Record<string, unknown>;
                const parts = [
                  s.libro,
                  s.capitulo,
                  s.pagina != null ? `p. ${s.pagina}` : null,
                ].filter(Boolean);
                return (
                  <p key={k} className="text-xs text-brand-mid italic">
                    Fuente: {parts.join(" · ")}
                  </p>
                );
              }
              return (
                <p key={k}>
                  <span className="font-medium capitalize">{label}:</span>{" "}
                  {String(v)}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export default function Chat({
  pendingMessage,
  onPendingConsumed,
  sessionId: initialSessionId = null,
  onSessionCreated,
  initialMessages = [],
}: ChatProps) {
  const { user, tenantId } = useAuth();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const sessionIdRef = useRef<string | null>(initialSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Mode state ──────────────────────────────────────────────────────────────
  const [queryMode, setQueryMode] = useState<"easy" | "extended">("easy");
  const [showHint, setShowHint] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Pending clarification: tracks the original question while user answers
  const pendingClarificationRef = useRef<{
    originalQuestion: string;
    sessionKey: string;
  } | null>(null);

  // ── Initialize mode from localStorage (client-side only) ───────────────────
  useEffect(() => {
    const saved = localStorage.getItem(LS_MODE) as "easy" | "extended" | null;
    if (saved) setQueryMode(saved);

    // Show floating hint after 2s if not dismissed and in easy mode
    const dismissed = localStorage.getItem(LS_HINT_DISMISSED);
    if (!dismissed && (!saved || saved === "easy")) {
      const timer = setTimeout(() => setShowHint(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── External pending message (from suggestions) ────────────────────────────
  useEffect(() => {
    if (pendingMessage && !loading) {
      handleSendText(pendingMessage);
      onPendingConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMessage]);

  // ── Mode handlers ───────────────────────────────────────────────────────────
  const handleSwitchToExtended = () => {
    setQueryMode("extended");
    localStorage.setItem(LS_MODE, "extended");
    setShowHint(false);
    localStorage.setItem(LS_HINT_DISMISSED, "true");

    // Auto-show the info popup the first time
    const seen = localStorage.getItem(LS_POPUP_SEEN);
    if (!seen) {
      setShowModal(true);
      localStorage.setItem(LS_POPUP_SEEN, "true");
    }
  };

  const handleSwitchToEasy = () => {
    setQueryMode("easy");
    localStorage.setItem(LS_MODE, "easy");
  };

  const handleDismissHint = () => {
    setShowHint(false);
    localStorage.setItem(LS_HINT_DISMISSED, "true");
  };

  // ── Core query execution (shared between easy and extended flow) ────────────
  const executeQuery = async (text: string, clarificationContext: string | null) => {
    try {
      const response: AgentResponse = await queryAgent(
        text,
        clarificationContext ?? undefined
      );
      const assistantMessage: Message = {
        role: "assistant",
        content: response?.explanation || "Consulta procesada correctamente.",
        response,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (sessionIdRef.current) {
        await addMessageToSession(sessionIdRef.current, {
          role: "assistant",
          content: assistantMessage.content,
          response,
        });
      }

      if (user) {
        await logQueryRequest({
          uid: user.uid,
          tenant_id: tenantId ?? "",
          session_id: sessionIdRef.current ?? "",
          question: text,
          sql: response?.sql,
          success: true,
        });
      }
    } catch (err) {
      const errorMsg = "Error al procesar tu pregunta. Por favor intenta de nuevo.";
      setMessages((prev) => [...prev, { role: "assistant", content: errorMsg }]);

      if (user) {
        await logQueryRequest({
          uid: user.uid,
          tenant_id: tenantId ?? "",
          session_id: sessionIdRef.current ?? "",
          question: text,
          success: false,
          error: String(err),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Called when user finishes answering clarification questions ─────────────
  const handleClarificationComplete = async (
    sessionKey: string,
    answers: Record<string, string>,
    questions: ClarifyQuestion[]
  ) => {
    const pending = pendingClarificationRef.current;
    if (!pending || pending.sessionKey !== sessionKey) return;

    const { originalQuestion } = pending;
    pendingClarificationRef.current = null;

    // Build a readable context string: "Período: Este mes. Agrupar por región: Sí."
    const clarificationContext = questions
      .filter((q) => answers[q.id])
      .map((q) => `${q.text}: ${answers[q.id]}`)
      .join(". ");

    setLoading(true);
    await executeQuery(originalQuestion, clarificationContext);
  };

  // ── Main send handler ───────────────────────────────────────────────────────
  const handleSendText = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Create session on first message
    if (!sessionIdRef.current && user) {
      const newId = await createChatSession(user.uid, tenantId ?? "", text);
      if (newId) {
        sessionIdRef.current = newId;
        onSessionCreated?.(newId);
      }
    }

    // Save user message
    if (sessionIdRef.current) {
      await addMessageToSession(sessionIdRef.current, {
        role: "user",
        content: text,
      });
    }

    // ── Extended Mode: ask clarification first ──────────────────────────────
    if (queryMode === "extended") {
      try {
        const clarifyResult = await clarifyQuery(text);
        if (clarifyResult.needs_clarification && clarifyResult.questions?.length > 0) {
          const sessionKey = `clarify_${Date.now()}`;
          pendingClarificationRef.current = { originalQuestion: text, sessionKey };

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "",
              clarificationData: {
                questions: clarifyResult.questions,
                sessionKey,
              },
            },
          ]);
          setLoading(false);
          return;
        }
        // No clarification needed — fall through to normal flow
      } catch {
        // Silently fall through if clarification endpoint fails
      }
    }

    // ── Easy Mode (or extended without clarification) ───────────────────────
    await executeQuery(text, null);
  };

  const handleSend = () => handleSendText(input);

  return (
    <div className="bg-white h-full w-full flex flex-col overflow-hidden min-w-0">
      {/* Extended Mode Info Modal */}
      {showModal && <ExtendedModeModal onClose={() => setShowModal(false)} />}

      {/* Header */}
      <div className="relative px-4 py-3 border-b border-brand-light bg-brand-light/20 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-brand-dark flex items-center justify-center">
          <Bot size={16} className="text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-brand-deepest">DataAgent</h2>
          <p className="text-xs text-brand-mid">Consulta tus datos en lenguaje natural</p>
        </div>

        {/* Mode toggle — right side of header */}
        <div className="ml-auto">
          <ModeToggle
            mode={queryMode}
            onEasy={handleSwitchToEasy}
            onExtended={handleSwitchToExtended}
            onInfoClick={() => setShowModal(true)}
          />
        </div>

        {/* Floating hint (only in easy mode, not yet dismissed) */}
        {showHint && queryMode === "easy" && (
          <FloatingModeHint
            onDismiss={handleDismissHint}
            onTryExtended={() => {
              handleSwitchToExtended();
              setShowHint(false);
            }}
          />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-w-0 w-full overflow-y-auto overflow-x-hidden space-y-3 p-4">
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
            <div key={i} className="w-full min-w-0">
              <AssistantMessage
                msg={msg}
                onClarificationComplete={handleClarificationComplete}
              />
            </div>
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
            placeholder={
              queryMode === "extended"
                ? "Pregunta en Modo Extendido..."
                : "Haz una pregunta sobre tus datos..."
            }
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
