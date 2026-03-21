"use client";

import { useEffect, useState } from "react";
import { getSecurityMetrics } from "@/lib/api";
import { ShieldAlert, AlertCircle, Lock, TrendingDown, Zap } from "lucide-react";

interface SecurityMetrics {
  blocked_threats: number;
  out_of_context_queries: number;
  restricted_access_attempts: number;
  circuit_breaker_activations: number;
  attack_type_breakdown: Record<string, number>;
  total_events: number;
}

const METRIC_CONFIG = [
  {
    key: "blocked_threats" as keyof SecurityMetrics,
    title: "Amenazas Bloqueadas",
    description: "Intentos de prompt injection y jailbreak bloqueados",
    icon: ShieldAlert,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-100",
  },
  {
    key: "out_of_context_queries" as keyof SecurityMetrics,
    title: "Consultas Fuera de Contexto",
    description: "Queries bloqueadas por acceso a datos no autorizados",
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  {
    key: "restricted_access_attempts" as keyof SecurityMetrics,
    title: "Accesos Restringidos",
    description: "Intentos de acceder a columnas o tablas restringidas",
    icon: Lock,
    color: "text-brand-dark",
    bg: "bg-brand-light/40",
    border: "border-brand-light",
  },
  {
    key: "circuit_breaker_activations" as keyof SecurityMetrics,
    title: "Circuit Breaker",
    description: "Activaciones por fallos consecutivos",
    icon: Zap,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-100",
  },
];

export default function Dashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getSecurityMetrics()
      .then((data) => setMetrics(data))
      .catch(() => setError(true));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingDown size={18} className="text-brand-dark" />
        <h2 className="text-lg font-semibold text-brand-deepest">Panel de Seguridad</h2>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>Metricas de seguridad no disponibles — backend no conectado.</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {METRIC_CONFIG.map((m) => {
          const Icon = m.icon;
          const value = metrics ? metrics[m.key] : null;
          return (
            <div
              key={m.key}
              className={`border ${m.border} ${m.bg} rounded-2xl p-4 card-hover shadow-card`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-brand-deepest/80">{m.title}</p>
                  <p className={`text-3xl font-bold mt-1 ${m.color}`}>
                    {typeof value === "number" ? value.toLocaleString() : "—"}
                  </p>
                  <p className="text-xs text-brand-dark/60 mt-1">{m.description}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${m.bg} border ${m.border} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={m.color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
