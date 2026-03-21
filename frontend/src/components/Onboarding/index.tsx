"use client";

import { useState } from "react";
import { connectOnboarding, testConnection } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Table2,
  EyeOff,
  Info,
  Wifi,
} from "lucide-react";

interface OnboardingResult {
  status: string;
  tenant_id: string;
  company_name: string;
  tables_found: number;
  next_steps: string[];
  schema_summary: Record<string, { total_columns: number; sensitive_columns_excluded_for_analyst: string[] }>;
}

export default function Onboarding() {
  const { tenantId } = useAuth();
  const [connectionString, setConnectionString] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [testLatency, setTestLatency] = useState<number | null>(null);

  // Derivar nombre legible del tenantId (ej: "contoso_a1b2" → "contoso")
  const companyDisplay = tenantId
    ? tenantId.replace(/_[a-z0-9]{4}$/, "").replace(/_/g, " ")
    : "—";

  const handleTest = async () => {
    if (!connectionString.trim()) return;
    setTestStatus("testing");
    setTestLatency(null);
    try {
      const res = await testConnection(connectionString);
      setTestLatency(res.latency_ms);
      setTestStatus("ok");
    } catch {
      setTestStatus("fail");
    }
  };

  const handleConnect = async () => {
    if (!connectionString.trim() || !tenantId) return;

    setLoading(true);
    setProgress(30);
    setResult(null);
    setError(null);

    try {
      setProgress(60);
      const data = await connectOnboarding({
        company_name: companyDisplay,
        connection_string: connectionString,
        tenant_id: tenantId,
      });
      setProgress(100);
      setResult(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error de conexión. Verifica las credenciales.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">

      {/* Info de solo lectura: empresa y tenant */}
      <div className="border border-brand-light rounded-2xl p-5 bg-brand-light/20 space-y-3">
        <div className="flex items-center gap-2 text-brand-dark">
          <Info size={15} />
          <span className="text-sm font-semibold">Información de la empresa</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-brand-mid mb-1 uppercase tracking-wide font-medium">Empresa</p>
            <p className="text-sm font-semibold text-brand-deepest capitalize">{companyDisplay}</p>
          </div>
          <div>
            <p className="text-xs text-brand-mid mb-1 uppercase tracking-wide font-medium">Tenant ID</p>
            <p className="text-sm font-mono text-brand-deepest">{tenantId ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Formulario: solo cadena de conexión */}
      <div className="border border-brand-light rounded-2xl p-5 bg-white shadow-card space-y-5">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-brand-dark" />
          <h2 className="font-semibold text-brand-deepest">Actualizar cadena de conexión</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-deepest mb-1.5">
            Connection String
          </label>
          <input
            type="password"
            value={connectionString}
            onChange={(e) => { setConnectionString(e.target.value); setTestStatus("idle"); }}
            placeholder="Server=tcp:...;Database=...;User ID=...;Password=...;"
            className="w-full border border-brand-light rounded-xl px-4 py-2.5 text-brand-deepest placeholder:text-brand-mid/70 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand-dark transition-all disabled:bg-brand-light/30"
            disabled={loading}
          />
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs text-brand-mid">
              Azure SQL Database — formato SQL Server. La cadena se cifra antes de almacenarse.
            </p>

            {/* Test status badge */}
            {testStatus === "ok" && (
              <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-0.5 shrink-0">
                <CheckCircle2 size={11} />
                Conexión OK {testLatency !== null && `· ${testLatency}ms`}
              </span>
            )}
            {testStatus === "fail" && (
              <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-0.5 shrink-0">
                <AlertCircle size={11} />
                Sin conexión
              </span>
            )}
          </div>
        </div>

        {/* Test Connection button */}
        <button
          type="button"
          onClick={handleTest}
          disabled={!connectionString.trim() || testStatus === "testing" || loading}
          className="w-full flex items-center justify-center gap-2 border border-brand-mid text-brand-dark py-2.5 rounded-xl font-medium hover:bg-brand-light/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm"
        >
          {testStatus === "testing" ? (
            <><Loader2 size={15} className="animate-spin" />Probando conexión...</>
          ) : (
            <><Wifi size={15} />Probar conexión</>
          )}
        </button>

        {loading && (
          <div className="space-y-2">
            <div className="w-full bg-brand-light rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-brand-dark h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-brand-mid">
              <Loader2 size={12} className="animate-spin" />
              Inspeccionando esquema y verificando conexión...
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={loading || !connectionString.trim() || !tenantId}
          className="w-full flex items-center justify-center gap-2 bg-brand-dark text-white py-2.5 rounded-xl font-semibold hover:bg-brand-deepest disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-brand text-sm"
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Conectando...
            </>
          ) : (
            <>
              <Database size={15} />
              Actualizar conexión
            </>
          )}
        </button>
      </div>

      {/* Resultado */}
      {result && (
        <div className="border border-green-200 rounded-2xl p-5 bg-green-50 space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-600" />
            <span className="font-semibold text-green-800">
              Conectado: {result.company_name}
            </span>
            <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-mono">
              {result.tenant_id}
            </span>
          </div>

          <p className="text-sm text-green-800">
            <span className="font-semibold">{result.tables_found}</span> tablas encontradas en el esquema.
          </p>

          {result.next_steps.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Próximos pasos</p>
              <ol className="list-decimal list-inside space-y-1">
                {result.next_steps.map((step, i) => (
                  <li key={i} className="text-sm text-green-700">{step}</li>
                ))}
              </ol>
            </div>
          )}

          {Object.keys(result.schema_summary).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Table2 size={13} />
                Resumen del esquema
              </p>
              <div className="space-y-2">
                {Object.entries(result.schema_summary).map(([table, info]) => (
                  <div key={table} className="bg-white border border-green-200 rounded-xl px-3 py-2 text-sm flex items-center justify-between gap-3">
                    <span className="font-mono font-semibold text-brand-deepest">{table}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-brand-mid text-xs">{info.total_columns} columnas</span>
                      {info.sensitive_columns_excluded_for_analyst.length > 0 && (
                        <span className="flex items-center gap-1 text-amber-700 text-xs bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5">
                          <EyeOff size={11} />
                          {info.sensitive_columns_excluded_for_analyst.join(", ")} ocultas
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
