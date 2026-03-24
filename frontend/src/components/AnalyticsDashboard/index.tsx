"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import { getAnalyticsSummary } from "@/lib/api";
import { BarChart2, Loader2, AlertCircle, RefreshCw } from "lucide-react";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

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

  // ── Status doughnut
  const statusLabels = Object.keys(s.status_distribution);
  const statusValues = Object.values(s.status_distribution);
  const statusChart = {
    labels: statusLabels,
    datasets: [{
      data: statusValues,
      backgroundColor: statusLabels.map((l) => STATUS_COLOR[l] ?? "#94a3b8"),
      borderWidth: 1,
    }],
  };

  // ── Risk doughnut
  const riskLabels = Object.keys(s.risk_distribution);
  const riskValues = Object.values(s.risk_distribution);
  const riskChart = {
    labels: riskLabels,
    datasets: [{
      data: riskValues,
      backgroundColor: riskLabels.map((l) => RISK_COLOR[l] ?? "#94a3b8"),
      borderWidth: 1,
    }],
  };

  // ── Block types bar
  const blockLabels = Object.keys(s.block_type_distribution);
  const blockValues = Object.values(s.block_type_distribution);
  const blockChart = {
    labels: blockLabels.length ? blockLabels : ["(sin bloqueos)"],
    datasets: [
      {
        label: "Bloqueos",
        data: blockValues.length ? blockValues : [0],
        backgroundColor: "#dc2626",
        borderRadius: 6,
      },
    ],
  };

  const pct = (r: number) => `${(r * 100).toFixed(1)}%`;
  const ms  = (v: number) => v ? `${v.toFixed(0)} ms` : "—";

  const doughnutOpts = {
    plugins: { legend: { position: "bottom" as const, labels: { font: { size: 11 } } } },
    cutout: "65%",
    maintainAspectRatio: true,
  };

  const barOpts = {
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
      x: { ticks: { font: { size: 11 } } },
    },
    maintainAspectRatio: true,
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
            {statusValues.every((v) => v === 0) ? (
              <p className="text-xs text-brand-dark/60 text-center py-6">Sin datos</p>
            ) : (
              <Doughnut data={statusChart} options={doughnutOpts} />
            )}
          </div>

          {/* Risk */}
          <div className="bg-brand-light/10 rounded-xl p-4">
            <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-3">
              Distribución de riesgo
            </p>
            {riskValues.every((v) => v === 0) ? (
              <p className="text-xs text-brand-dark/60 text-center py-6">Sin datos</p>
            ) : (
              <Doughnut data={riskChart} options={doughnutOpts} />
            )}
          </div>

          {/* Block types */}
          <div className="bg-brand-light/10 rounded-xl p-4">
            <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-3">
              Tipos de bloqueo
            </p>
            <Bar data={blockChart} options={barOpts} />
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
