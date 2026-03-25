"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getAnalyticsSummary } from "@/lib/api";
import { BarChart2, Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface Stats {
  total_queries: number;
  success_rate: number;
  block_rate: number;
  error_rate: number;
  clarification_rate: number;
  avg_execution_time_ms: number;
  p95_execution_time_ms: number;
  risk_distribution: Record<string, number>;
  status_distribution: Record<string, number>;
  block_type_distribution: Record<string, number>;
  total_security_events: number;
}

interface Summary {
  stats: Stats;
  generated_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  success: "#16a34a",
  allowed: "#16a34a",
  blocked: "#dc2626",
  error: "#ef4444",
  warning: "#f59e0b",
  clarification_needed: "#f59e0b",
  analytics_chat: "#3b82f6",
};

const RISK_COLOR: Record<string, string> = {
  low: "#16a34a",
  medium: "#f59e0b",
  high: "#dc2626",
  critical: "#7f1d1d",
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-brand-light/20 border border-brand-light rounded-xl px-4 py-3">
      <p className="text-xs text-brand-dark/70 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-brand-deepest mt-0.5">{value}</p>
      {sub && <p className="text-xs text-brand-dark/60 mt-0.5">{sub}</p>}
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload?: { fill?: string } }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-brand-deepest text-white px-3 py-2 rounded-lg shadow-lg text-xs">
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: p.payload?.fill ?? "#fff" }}
          />
          <span className="text-white/70">{p.name}:</span>
          <span className="font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getAnalyticsSummary(200);
      setData(res as unknown as Summary);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="border border-brand-light rounded-2xl bg-white shadow-card p-8 flex items-center justify-center gap-2 text-brand-dark">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Cargando métricas...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border border-brand-light rounded-2xl bg-white shadow-card p-6 flex items-center gap-2 text-amber-700 bg-amber-50">
        <AlertCircle size={16} className="shrink-0" />
        <span className="text-sm">No se pudieron cargar las métricas de analytics.</span>
      </div>
    );
  }

  const s = data.stats;

  // ── Status pie data
  const statusData = Object.entries(s.status_distribution)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name,
      value,
      fill: STATUS_COLOR[name] ?? "#94a3b8",
    }));

  // ── Risk pie data
  const riskData = Object.entries(s.risk_distribution)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name,
      value,
      fill: RISK_COLOR[name] ?? "#94a3b8",
    }));

  // ── Block types bar data
  const blockData = Object.entries(s.block_type_distribution).map(([name, value]) => ({
    name,
    value,
  }));

  const pct = (r: number) => `${(r * 100).toFixed(1)}%`;
  const ms  = (v: number) => v ? `${v.toFixed(0)} ms` : "—";

  const renderPie = (pieData: { name: string; value: number; fill: string }[]) => {
    if (pieData.length === 0) {
      return <p className="text-xs text-brand-dark/60 text-center py-6">Sin datos</p>;
    }
    return (
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
            animationDuration={800}
          >
            {pieData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} stroke="#fff" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span className="text-xs text-brand-deepest">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="border border-brand-light rounded-2xl bg-white shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-brand-light bg-brand-light/20">
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="text-brand-dark" />
          <h2 className="text-lg font-semibold text-brand-deepest">Analytics de Logs</h2>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-brand-dark border border-brand-light px-3 py-1.5 rounded-lg hover:bg-brand-light/40 transition-all"
        >
          <RefreshCw size={12} />
          Actualizar
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total consultas" value={String(s.total_queries)} />
          <StatCard label="Tasa de éxito" value={pct(s.success_rate)} />
          <StatCard label="Tasa de bloqueo" value={pct(s.block_rate)} />
          <StatCard
            label="Tiempo promedio"
            value={ms(s.avg_execution_time_ms)}
            sub={`P95: ${ms(s.p95_execution_time_ms)}`}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Status */}
          <div className="bg-brand-light/10 rounded-xl p-4">
            <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-3">
              Estado de consultas
            </p>
            {renderPie(statusData)}
          </div>

          {/* Risk */}
          <div className="bg-brand-light/10 rounded-xl p-4">
            <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-3">
              Distribución de riesgo
            </p>
            {renderPie(riskData)}
          </div>

          {/* Block types */}
          <div className="bg-brand-light/10 rounded-xl p-4">
            <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-3">
              Tipos de bloqueo
            </p>
            {blockData.length === 0 ? (
              <p className="text-xs text-brand-dark/60 text-center py-6">Sin bloqueos</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={blockData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#dc2626" radius={[4, 4, 0, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-brand-dark/50 text-right">
          Actualizado: {new Date(data.generated_at).toLocaleString("es")}
        </p>
      </div>
    </div>
  );
}