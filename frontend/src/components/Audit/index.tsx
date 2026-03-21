"use client";

import { useEffect, useState } from "react";
import { getAuditLogs } from "@/lib/api";
import { ClipboardList, Download, AlertCircle, Loader2 } from "lucide-react";

interface AuditLog {
  date?: string;
  user?: string;
  question?: string;
  status?: string;
  risk_level?: string;
  block_type?: string;
}

const RISK_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
};

const STATUS_COLORS: Record<string, string> = {
  blocked: "bg-red-100 text-red-700",
  allowed: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
};

export default function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getAuditLogs()
      .then((data) => setLogs(Array.isArray(data) ? (data as AuditLog[]) : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleExportCSV = () => {
    const headers = ["Date", "User", "Question", "Status", "Risk", "Block Type"];
    const rows = logs.map((log) => [
      log.date ?? "",
      log.user ?? "",
      `"${(log.question ?? "").replace(/"/g, '""')}"`,
      log.status ?? "",
      log.risk_level ?? "",
      log.block_type ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = ["Fecha", "Usuario", "Pregunta", "Estado", "Riesgo", "Tipo de bloqueo"];

  return (
    <div className="border border-brand-light rounded-2xl bg-white shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-4 border-b border-brand-light bg-brand-light/20">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-brand-dark" />
          <h2 className="text-lg font-semibold text-brand-deepest">Audit Logs</h2>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={logs.length === 0}
          className="flex items-center gap-1.5 bg-brand-dark text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-deepest disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Download size={14} />
          Exportar CSV
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border-b border-amber-100 px-5 py-3">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>Audit logs no disponibles — backend no conectado aún.</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-brand-light/30">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-xs font-semibold text-brand-dark uppercase tracking-wide whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-brand-mid">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-sm">Cargando registros...</span>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-brand-mid">
                    <ClipboardList size={24} />
                    <span className="text-sm">No hay registros de auditoría aún.</span>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log, i) => (
                <tr key={i} className="border-t border-brand-light/50 hover:bg-brand-light/20 transition-colors">
                  <td className="px-4 py-3 text-sm text-brand-deepest whitespace-nowrap">{log.date ?? "—"}</td>
                  <td className="px-4 py-3 text-sm font-medium text-brand-deepest">{log.user ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-brand-deepest/80 max-w-xs truncate">{log.question ?? "—"}</td>
                  <td className="px-4 py-3">
                    {log.status ? (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[log.status.toLowerCase()] ?? "bg-brand-light text-brand-deepest"}`}>
                        {log.status}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {log.risk_level ? (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RISK_COLORS[log.risk_level.toLowerCase()] ?? "bg-brand-light text-brand-deepest"}`}>
                        {log.risk_level}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-brand-dark/70">{log.block_type ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
