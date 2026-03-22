"use client";

import { useEffect, useState } from "react";
import { getSecurityMetrics, getRecentActivity } from "@/lib/api";
import {
  ShieldAlert,
  AlertCircle,
  Lock,
  TrendingDown,
  RefreshCw,
  Activity,
  Zap,
} from "lucide-react";

interface SecurityMetrics {
  blocked_threats: number;
  out_of_context_queries: number;
  restricted_access_attempts: number;
  circuit_breaker_activations: number;
  attack_type_breakdown: Record<string, number>;
  total_events: number;
}

interface RecentEvent {
  timestamp: string;
  type: string;
  event_type: string;
  user_email: string;
  question?: string;
  details: Record<string, unknown>;
}

const METRIC_CONFIG = [
  {
    key: "blocked_threats" as keyof SecurityMetrics,
    title: "Amenazas Bloqueadas",
    description: "Intentos de prompt injection y jailbreak bloqueados por Prompt Shields",
    icon: ShieldAlert,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-100",
  },
  {
    key: "out_of_context_queries" as keyof SecurityMetrics,
    title: "Consultas Fuera de Contexto",
    description: "Queries bloqueadas por intentar acceder a datos fuera del scope autorizado",
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  {
    key: "restricted_access_attempts" as keyof SecurityMetrics,
    title: "Accesos Restringidos",
    description: "Intentos de acceder a columnas o tablas con restricciones de rol",
    icon: Lock,
    color: "text-brand-dark",
    bg: "bg-brand-light/40",
    border: "border-brand-light",
  },
  {
    key: "circuit_breaker_activations" as keyof SecurityMetrics,
    title: "Circuit Breaker",
    description: "Activaciones del circuit breaker por fallos consecutivos en ejecución",
    icon: Zap,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-100",
  },
];

const EVENT_COLORS: Record<string, string> = {
  prompt_shields: "bg-red-500",
  context_filter: "bg-amber-400",
  circuit_breaker: "bg-purple-500",
  restricted_column_access: "bg-red-500",
  out_of_domain: "bg-amber-400",
  query_ok: "bg-green-500",
  error: "bg-red-400",
};

const EVENT_LABELS: Record<string, string> = {
  prompt_shields: "Prompt injection bloqueado",
  context_filter: "Consulta fuera de contexto rechazada",
  circuit_breaker: "Circuit breaker activado",
  restricted_column_access: "Acceso a columna restringida",
  out_of_domain: "Consulta fuera de dominio",
  query_ok: "Consulta procesada correctamente",
  error: "Error en ejecución",
};

function formatRelativeTime(isoTimestamp: string): string {
  const diff = Date.now() - new Date(isoTimestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

export default function SecurityContent() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setError(false);
    try {
      const [metricsData, activityData] = await Promise.all([
        getSecurityMetrics(),
        getRecentActivity(10),
      ]);
      setMetrics(metricsData);
      setRecentEvents(activityData.events);
    } catch {
      setError(true);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const attackBreakdown = metrics?.attack_type_breakdown ?? {};
  const hasBreakdown = Object.keys(attackBreakdown).length > 0;

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={20} className="text-brand-dark" />
            <h1 className="text-2xl font-bold text-brand-deepest">Panel de Seguridad</h1>
          </div>
          <p className="text-brand-dark/60 text-sm">
            Monitoreo en tiempo real de amenazas y accesos no autorizados en tu entorno.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 border border-brand-light text-brand-dark px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-brand-light/50 disabled:opacity-40 transition-all"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>Metricas no disponibles — verifica la conexion con el backend.</span>
        </div>
      )}

      {/* Metric cards — 4 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRIC_CONFIG.map((m) => {
          const Icon = m.icon;
          const value = metrics ? metrics[m.key] : null;
          return (
            <div
              key={m.key}
              className={`border ${m.border} ${m.bg} rounded-2xl p-5 card-hover shadow-card`}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-semibold text-brand-deepest/80 leading-snug pr-2">{m.title}</p>
                <div className={`w-9 h-9 rounded-xl ${m.bg} border ${m.border} flex items-center justify-center shrink-0`}>
                  <Icon size={17} className={m.color} />
                </div>
              </div>
              <p className={`text-4xl font-bold ${m.color} mb-1`}>
                {typeof value === "number" ? value.toLocaleString() : "—"}
              </p>
              <p className="text-xs text-brand-dark/50">{m.description}</p>
            </div>
          );
        })}
      </div>

      {/* Attack type breakdown */}
      {hasBreakdown && (
        <div className="border border-brand-light rounded-2xl bg-white shadow-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-brand-light bg-brand-light/20">
            <ShieldAlert size={16} className="text-red-600" />
            <h2 className="font-semibold text-brand-deepest">Desglose por Tipo de Ataque</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {Object.entries(attackBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => {
                const total = metrics?.blocked_threats || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-brand-deepest font-medium capitalize">
                        {type.replace(/_/g, " ")}
                      </span>
                      <span className="text-brand-mid">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-brand-light/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Activity log — real data */}
      <div className="border border-brand-light rounded-2xl bg-white shadow-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-brand-light bg-brand-light/20">
          <Activity size={16} className="text-brand-dark" />
          <h2 className="font-semibold text-brand-deepest">Actividad reciente</h2>
          <span className="ml-auto text-xs text-brand-mid">
            {metrics ? `${metrics.total_events} eventos totales` : ""}
          </span>
        </div>
        <div className="divide-y divide-brand-light/50">
          {recentEvents.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-brand-mid">
              No hay actividad reciente registrada.
            </div>
          ) : (
            recentEvents.map((ev, i) => {
              const label = EVENT_LABELS[ev.event_type] || ev.event_type;
              const dotColor = EVENT_COLORS[ev.event_type] || "bg-gray-400";
              const detail = ev.user_email
                ? `${label} — ${ev.user_email}`
                : label;
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-brand-light/10 transition-colors">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                  <p className="text-sm text-brand-deepest flex-1 truncate">{detail}</p>
                  <span className="text-xs text-brand-mid shrink-0">
                    {formatRelativeTime(ev.timestamp)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
