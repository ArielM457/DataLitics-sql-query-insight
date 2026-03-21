"use client";

import { useEffect, useState } from "react";
import { getSecurityMetrics } from "@/lib/api";
import {
  ShieldAlert,
  AlertCircle,
  Lock,
  TrendingDown,
  RefreshCw,
  Activity,
} from "lucide-react";

interface SecurityMetrics {
  blocked_threats: number;
  out_of_context_queries: number;
  restricted_access_attempts: number;
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
    trend: "+12% vs semana anterior",
  },
  {
    key: "out_of_context_queries" as keyof SecurityMetrics,
    title: "Consultas Fuera de Contexto",
    description: "Queries bloqueadas por intentar acceder a datos fuera del scope autorizado",
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
    trend: "-3% vs semana anterior",
  },
  {
    key: "restricted_access_attempts" as keyof SecurityMetrics,
    title: "Accesos Restringidos",
    description: "Intentos de acceder a columnas o tablas con restricciones de rol",
    icon: Lock,
    color: "text-brand-dark",
    bg: "bg-brand-light/40",
    border: "border-brand-light",
    trend: "Sin cambios",
  },
];

export default function SecurityContent() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setError(false);
    try {
      const data = await getSecurityMetrics();
      setMetrics(data);
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
          <span>Métricas no disponibles — backend no conectado aún. Se muestran datos de ejemplo.</span>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {METRIC_CONFIG.map((m) => {
          const Icon = m.icon;
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
                {metrics ? metrics[m.key].toLocaleString() : "—"}
              </p>
              <p className="text-xs text-brand-dark/50 mb-2">{m.description}</p>
              <p className="text-xs text-brand-mid font-medium">{m.trend}</p>
            </div>
          );
        })}
      </div>

      {/* Activity log placeholder */}
      <div className="border border-brand-light rounded-2xl bg-white shadow-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-brand-light bg-brand-light/20">
          <Activity size={16} className="text-brand-dark" />
          <h2 className="font-semibold text-brand-deepest">Actividad reciente</h2>
          <span className="ml-auto text-xs text-brand-mid">Últimas 24 horas</span>
        </div>
        <div className="divide-y divide-brand-light/50">
          {[
            { type: "block", msg: "Prompt injection bloqueado — usuario analyst@empresa.com", time: "Hace 3 min", color: "bg-red-500" },
            { type: "warn",  msg: "Consulta fuera de contexto detectada y rechazada", time: "Hace 18 min", color: "bg-amber-400" },
            { type: "block", msg: "Intento de acceso a columna 'Salary' sin permisos", time: "Hace 1h", color: "bg-red-500" },
            { type: "ok",    msg: "Consulta procesada correctamente — 42 filas devueltas", time: "Hace 1h 12m", color: "bg-green-500" },
            { type: "warn",  msg: "Jailbreak attempt bloqueado por circuit breaker", time: "Hace 3h", color: "bg-amber-400" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-brand-light/10 transition-colors">
              <span className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
              <p className="text-sm text-brand-deepest flex-1">{item.msg}</p>
              <span className="text-xs text-brand-mid shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
