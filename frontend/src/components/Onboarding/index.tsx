"use client";

import { useState } from "react";
import { connectOnboarding, testConnection } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Table2,
  Shield,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface DBFields {
  server: string;
  database: string;
  port: string;
  username: string;
  password: string;
}

interface OnboardingResult {
  status: string;
  tenant_id: string;
  company_name: string;
  tables_found: number;
  next_steps: string[];
  schema_summary: Record<
    string,
    {
      total_columns: number;
      sensitive_columns_excluded_for_analyst: string[];
    }
  >;
}

type TestStatus = "idle" | "testing" | "ok" | "fail";
type Step = 1 | 2 | 3;

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function buildConnectionString(f: DBFields): string {
  return `Driver={ODBC Driver 18 for SQL Server};Server=tcp:${f.server},${f.port};Database=${f.database};User ID=${f.username};Password=${f.password};Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;`;
}

function deriveStep(
  testStatus: TestStatus,
  loading: boolean,
  result: OnboardingResult | null
): Step {
  if (result) return 3;
  if (loading || testStatus !== "idle") return 2;
  return 1;
}

/* ─── Shared style ───────────────────────────────────────────────────────── */

const INPUT_BASE =
  "w-full bg-white border border-[#c0c7cd]/50 rounded-lg px-4 py-3 text-sm " +
  "focus:ring-2 focus:ring-[#003f54]/10 focus:border-[#003f54] transition-all " +
  "outline-none placeholder:text-[#71787d]/60 disabled:opacity-40 disabled:cursor-not-allowed";

const GLASS =
  "rounded-xl shadow-2xl shadow-[#003f54]/5" as const;
const GLASS_STYLE = {
  background: "rgba(255, 255, 255, 0.78)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(192, 199, 205, 0.25)",
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   ROOT COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function Onboarding() {
  const { tenantId } = useAuth();

  const [fields, setFields] = useState<DBFields>({
    server: "",
    database: "",
    port: "1433",
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [testError, setTestError] = useState("");

  const currentStep = deriveStep(testStatus, loading, result);

  const companyDisplay = tenantId
    ? tenantId.replace(/_[a-z0-9]{4}$/, "").replace(/_/g, " ")
    : "—";

  const set = (key: keyof DBFields, value: string) => {
    setFields((f) => ({ ...f, [key]: value }));
    setTestStatus("idle");
    setTestError("");
  };

  const canTest = !!(
    fields.server.trim() &&
    fields.database.trim() &&
    fields.username.trim() &&
    fields.password.trim()
  );

  /* ── Handlers ── */

  const handleTest = async () => {
    if (!canTest) return;
    setTestStatus("testing");
    setTestLatency(null);
    setTestError("");
    try {
      const res = await testConnection(buildConnectionString(fields));
      setTestLatency(res.latency_ms);
      setTestStatus("ok");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No se pudo conectar";
      setTestError(msg);
      setTestStatus("fail");
    }
  };

  const handleConnect = async () => {
    if (!canTest || !tenantId) return;
    setLoading(true);
    setProgress(30);
    setResult(null);
    setError(null);
    try {
      setProgress(60);
      const data = await connectOnboarding({
        company_name: companyDisplay,
        connection_string: buildConnectionString(fields),
        tenant_id: tenantId,
      });
      setProgress(100);
      setResult(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Error de conexión. Verifica las credenciales.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTestStatus("idle");
    setTestError("");
    setTestLatency(null);
    setError(null);
    setResult(null);
    setProgress(0);
  };

  /* ── Render ── */

  return (
    <div className="relative">
      {/* Subtle dot-pattern background */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(#003f54 0.5px, transparent 0.5px)",
            backgroundSize: "24px 24px",
            opacity: 0.04,
          }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto py-6">
        {/* Stepper */}
        <StepperNav currentStep={currentStep} />

        {/* ── Step 1: Connect ── */}
        {currentStep === 1 && (
          <Step1
            fields={fields}
            set={set}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            loading={loading}
            canTest={canTest}
            onTest={handleTest}
            tenantId={tenantId}
            companyDisplay={companyDisplay}
          />
        )}

        {/* ── Step 2: Test ── */}
        {currentStep === 2 && (
          <Step2
            testStatus={testStatus}
            testLatency={testLatency}
            testError={testError}
            loading={loading}
            progress={progress}
            error={error}
            canConnect={canTest && !!tenantId}
            onConnect={handleConnect}
            onReset={handleReset}
          />
        )}

        {/* ── Step 3: Confirm ── */}
        {currentStep === 3 && result && <Step3 result={result} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STEPPER NAVIGATION
   ═══════════════════════════════════════════════════════════════════════════ */

function StepperNav({ currentStep }: { currentStep: Step }) {
  const steps: { n: Step; label: string }[] = [
    { n: 1, label: "Connect" },
    { n: 2, label: "Test" },
    { n: 3, label: "Confirm" },
  ];

  return (
    <nav className="flex items-center justify-between mb-12 relative">
      {/* connector line */}
      <div
        className="absolute top-5 left-0 w-full h-px bg-[#c0c7cd]"
        style={{ zIndex: 0 }}
        aria-hidden
      />
      {steps.map(({ n, label }) => {
        const active = n === currentStep;
        const done = n < currentStep;
        return (
          <div
            key={n}
            className="relative z-10 flex flex-col items-center gap-2 bg-white px-4"
          >
            <div
              className={[
                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300",
                active
                  ? "bg-[#003f54] text-white shadow-lg shadow-[#003f54]/20"
                  : done
                  ? "bg-[#20566d] text-white"
                  : "bg-[#e1e9ef] border-2 border-[#c0c7cd] text-[#71787d]",
              ].join(" ")}
            >
              {done ? "✓" : n}
            </div>
            <span
              className={[
                "text-[10px] font-bold uppercase tracking-widest transition-all",
                active
                  ? "text-[#003f54]"
                  : done
                  ? "text-[#20566d]"
                  : "text-[#71787d]",
              ].join(" ")}
            >
              {label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 1 — CONNECTION FORM
   ═══════════════════════════════════════════════════════════════════════════ */

interface Step1Props {
  fields: DBFields;
  set: (key: keyof DBFields, value: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  loading: boolean;
  canTest: boolean;
  onTest: () => void;
  tenantId: string | null;
  companyDisplay: string;
}

function Step1({
  fields,
  set,
  showPassword,
  setShowPassword,
  loading,
  canTest,
  onTest,
  tenantId,
  companyDisplay,
}: Step1Props) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      {/* ── Left: editorial info ── */}
      <div className="lg:col-span-4 space-y-6 py-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#003f54] leading-tight mb-3">
            Configura tu fuente de datos
          </h2>
          <p className="text-[#41484c] text-sm leading-relaxed">
            DataLitics se conecta de forma segura a tu infraestructura. Soporte
            nativo para SQL Server, PostgreSQL y MySQL con encriptación AES-256
            de extremo a extremo.
          </p>
        </div>

        {/* Company info */}
        {tenantId && (
          <div className="border-t border-[#c0c7cd]/30 pt-5 space-y-3">
            <div>
              <p className="text-[10px] font-bold text-[#71787d] uppercase tracking-widest mb-0.5">
                Empresa
              </p>
              <p className="text-sm font-semibold text-[#003f54] capitalize">
                {companyDisplay}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#71787d] uppercase tracking-widest mb-0.5">
                Tenant ID
              </p>
              <p className="text-xs font-mono text-[#41484c] break-all">
                {tenantId}
              </p>
            </div>
          </div>
        )}

        {/* Security badge */}
        <div className="border-t border-[#c0c7cd]/30 pt-5">
          <div className="flex items-start gap-3">
            <Shield size={18} className="text-[#003f54] mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-[#003f54] uppercase tracking-widest mb-1">
                Seguridad Tier 4
              </p>
              <p className="text-xs text-[#71787d] leading-relaxed">
                Conexión cifrada. Las credenciales nunca se almacenan en texto
                plano.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: glass form card ── */}
      <div className="lg:col-span-8">
        <div className={GLASS} style={GLASS_STYLE}>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Server */}
              <div className="md:col-span-2">
                <FormLabel>Host / Servidor</FormLabel>
                <input
                  type="text"
                  value={fields.server}
                  onChange={(e) => set("server", e.target.value)}
                  placeholder="dataliticsdb.database.windows.net"
                  disabled={loading}
                  className={`${INPUT_BASE} font-mono`}
                />
                <Hint>Ej: servidor.database.windows.net o IP del host</Hint>
              </div>

              {/* Database */}
              <div>
                <FormLabel>Base de Datos</FormLabel>
                <input
                  type="text"
                  value={fields.database}
                  onChange={(e) => set("database", e.target.value)}
                  placeholder="empresa_a"
                  disabled={loading}
                  className={`${INPUT_BASE} font-mono`}
                />
              </div>

              {/* Port */}
              <div>
                <FormLabel>Puerto</FormLabel>
                <input
                  type="text"
                  value={fields.port}
                  onChange={(e) => set("port", e.target.value)}
                  disabled={loading}
                  className={`${INPUT_BASE} font-mono`}
                />
                <Hint>SQL Server: 1433 · PostgreSQL: 5432 · MySQL: 3306</Hint>
              </div>

              {/* Username */}
              <div>
                <FormLabel>Usuario SQL</FormLabel>
                <input
                  type="text"
                  value={fields.username}
                  onChange={(e) => set("username", e.target.value)}
                  placeholder="dataagent_user"
                  disabled={loading}
                  className={INPUT_BASE}
                />
                <Hint>El usuario creado en la base de datos</Hint>
              </div>

              {/* Password */}
              <div>
                <FormLabel>Contraseña</FormLabel>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={fields.password}
                    onChange={(e) => set("password", e.target.value)}
                    placeholder="••••••••••••"
                    disabled={loading}
                    className={`${INPUT_BASE} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71787d] hover:text-[#003f54] transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={onTest}
                disabled={!canTest || loading}
                className="w-full sm:w-auto px-8 py-3 rounded-lg border border-[#71787d] text-[#003f54] text-sm font-bold hover:bg-[#edf5fb] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Probar conexión
              </button>
              <button
                type="button"
                onClick={onTest}
                disabled={!canTest || loading}
                className="w-full sm:w-auto px-10 py-3 rounded-lg bg-[#20566d] text-white text-sm font-bold shadow-lg shadow-[#20566d]/20 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                Conectar
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 2 — TESTING / CONNECTING
   ═══════════════════════════════════════════════════════════════════════════ */

interface Step2Props {
  testStatus: TestStatus;
  testLatency: number | null;
  testError: string;
  loading: boolean;
  progress: number;
  error: string | null;
  canConnect: boolean;
  onConnect: () => void;
  onReset: () => void;
}

function Step2({
  testStatus,
  testLatency,
  testError,
  loading,
  progress,
  error,
  canConnect,
  onConnect,
  onReset,
}: Step2Props) {
  const isBusy = testStatus === "testing" || loading;

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className={GLASS} style={GLASS_STYLE}>
        <div className="p-8 space-y-6">

          {/* ── Busy: testing / inspecting ── */}
          {isBusy && (
            <div className="text-center space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#c0e8ff] text-[#001e2b] text-[10px] font-bold uppercase tracking-tight">
                <span className="w-1.5 h-1.5 rounded-full bg-[#20566d] animate-pulse" />
                {loading ? "Inspeccionando esquema" : "Verificando conexión"}
              </div>

              <h3 className="text-xl font-bold text-[#003f54]">
                {loading
                  ? "Explorando arquitectura de datos..."
                  : "Analizando infraestructura..."}
              </h3>

              <div className="space-y-2">
                <div className="w-full h-3 bg-[#e1e9ef] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#003f54] to-[#20566d] rounded-full transition-all duration-700"
                    style={{ width: loading ? `${progress}%` : "55%" }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-[#71787d] uppercase tracking-widest">
                  <span>Verificando credenciales...</span>
                  <span>
                    {loading ? "Mapeando esquema..." : "Midiendo latencia..."}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-[#41484c]">
                <Loader2 size={14} className="animate-spin text-[#003f54]" />
                {loading
                  ? "Esto puede tomar unos segundos"
                  : "Estableciendo conexión segura..."}
              </div>
            </div>
          )}

          {/* ── Test OK ── */}
          {testStatus === "ok" && !loading && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={22} className="text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-[#003f54] text-sm">
                    Conexión verificada correctamente
                  </p>
                  <p className="text-xs text-[#71787d]">
                    {testLatency !== null
                      ? `Latencia media: ${testLatency}ms`
                      : "Servidor alcanzable"}
                  </p>
                </div>
              </div>

              {/* Latency card */}
              {testLatency !== null && (
                <div
                  className="p-5 rounded-xl border-l-4 border-[#003f54]"
                  style={{ background: "rgba(192, 232, 255, 0.18)" }}
                >
                  <p className="text-[10px] font-bold text-[#71787d] uppercase tracking-widest mb-1">
                    Latencia media
                  </p>
                  <p className="text-3xl font-black text-[#003f54] tracking-tighter">
                    {testLatency}
                    <span className="text-base font-semibold ml-1">ms</span>
                  </p>
                </div>
              )}

              {/* Connect error (after failed connect attempt) */}
              {error && (
                <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-3">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  onClick={onReset}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg border border-[#71787d] text-[#003f54] text-sm font-bold hover:bg-[#edf5fb] transition-all"
                >
                  ← Volver
                </button>
                <button
                  type="button"
                  onClick={onConnect}
                  disabled={!canConnect}
                  className="flex-1 flex items-center justify-center gap-2 px-10 py-3 rounded-lg bg-[#003f54] text-white text-sm font-bold shadow-lg shadow-[#003f54]/20 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Inspeccionar esquema
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Test FAIL ── */}
          {testStatus === "fail" && !loading && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <AlertCircle size={22} className="text-red-600" />
                </div>
                <div>
                  <p className="font-bold text-red-800 text-sm">
                    No se pudo establecer conexión
                  </p>
                  <p className="text-xs text-red-600">
                    {testError || "Verifica las credenciales e inténtalo de nuevo"}
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-[#edf5fb] rounded-xl p-5 space-y-3">
                <p className="text-[10px] font-bold text-[#003f54] uppercase tracking-widest">
                  Recomendaciones
                </p>
                {[
                  "Verifica que el servidor sea accesible desde esta red",
                  "Confirma que el usuario SQL tenga permisos de lectura (db_datareader)",
                  "Asegúrate de que el puerto esté abierto en el firewall del servidor",
                  "Revisa que el nombre de la base de datos sea correcto",
                  "Si usas Azure SQL, permite la IP de salida en las reglas de firewall del servidor",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-[#41484c]">
                    <span className="w-4 h-4 rounded-full bg-[#003f54]/10 text-[#003f54] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {tip}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={onReset}
                className="w-full px-6 py-3 rounded-lg border border-[#71787d] text-[#003f54] text-sm font-bold hover:bg-[#edf5fb] transition-all"
              >
                ← Revisar credenciales
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 3 — CONFIRM (SUCCESS)
   ═══════════════════════════════════════════════════════════════════════════ */

function Step3({ result }: { result: OnboardingResult }) {
  const totalSensitive = Object.values(result.schema_summary).reduce(
    (acc, t) => acc + t.sensitive_columns_excluded_for_analyst.length,
    0
  );

  return (
    <div className="space-y-10">
      {/* Success header */}
      <div className="flex flex-col items-center text-center pt-4">
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
          <CheckCircle2
            size={48}
            className="text-emerald-600"
            strokeWidth={1.5}
          />
        </div>
        <h3 className="text-2xl font-extrabold text-[#003f54] mb-2">
          ¡Conexión exitosa!
        </h3>
        <p className="text-[#41484c] text-sm max-w-md leading-relaxed">
          Hemos mapeado correctamente tu arquitectura de datos. A continuación
          se presenta un resumen de los hallazgos.
        </p>
        <span className="mt-3 text-xs bg-[#c0e8ff] text-[#001e2b] px-3 py-1 rounded-full font-mono">
          {result.tenant_id}
        </span>
      </div>

      {/* Stats bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          label="Tablas encontradas"
          value={String(result.tables_found)}
          accent="#003f54"
        />
        <StatCard
          label="Columnas excluidas"
          value={String(totalSensitive)}
          accent="#36637c"
        />
        <StatCard
          label="Empresa"
          value={result.company_name}
          small
          accent="#223d45"
        />
      </div>

      {/* Schema table */}
      {Object.keys(result.schema_summary).length > 0 && (
        <div className={GLASS} style={GLASS_STYLE}>
          <div className="bg-[#edf5fb]/80 px-6 py-4 flex justify-between items-center border-b border-[#c0c7cd]/15 rounded-t-xl">
            <div className="flex items-center gap-2">
              <Table2 size={14} className="text-[#003f54]" />
              <h4 className="text-[10px] font-bold text-[#003f54] uppercase tracking-widest">
                Vista previa del esquema
              </h4>
            </div>
            <span className="text-[10px] text-[#71787d] bg-white px-2 py-1 rounded border border-[#c0c7cd]/30">
              {Object.keys(result.schema_summary).length} tablas
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-white/50">
                  {["Tabla", "Columnas", "Columnas sensibles", "Estado"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-6 py-4 text-[10px] font-bold text-[#41484c] uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c0c7cd]/10">
                {Object.entries(result.schema_summary).map(([table, info]) => (
                  <tr
                    key={table}
                    className="hover:bg-[#edf5fb]/40 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono font-semibold text-[#003f54]">
                      {table}
                    </td>
                    <td className="px-6 py-4 text-[#41484c]">
                      {info.total_columns}
                    </td>
                    <td className="px-6 py-4">
                      {info.sensitive_columns_excluded_for_analyst.length > 0 ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                          {info.sensitive_columns_excluded_for_analyst.join(
                            ", "
                          )}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#71787d]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                        Listo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Next steps */}
      {result.next_steps.length > 0 && (
        <div className={GLASS} style={GLASS_STYLE}>
          <div className="p-6 space-y-3">
            <p className="text-[10px] font-bold text-[#003f54] uppercase tracking-widest">
              Próximos pasos
            </p>
            <ol className="space-y-2.5">
              {result.next_steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[#41484c]">
                  <span className="w-5 h-5 rounded-full bg-[#003f54]/10 text-[#003f54] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex justify-center pb-6">
        <a
          href="/dashboard"
          className="group px-12 py-4 rounded-xl bg-gradient-to-br from-[#003f54] to-[#20566d] text-white text-base font-bold shadow-2xl shadow-[#003f54]/30 flex items-center gap-3 hover:-translate-y-1 transition-all"
        >
          Ir al dashboard
          <ArrowRight
            size={20}
            className="group-hover:translate-x-1 transition-transform"
          />
        </a>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SMALL SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function StatCard({
  label,
  value,
  accent,
  small = false,
}: {
  label: string;
  value: string;
  accent: string;
  small?: boolean;
}) {
  return (
    <div
      className="p-6 rounded-xl shadow-sm"
      style={{
        ...GLASS_STYLE,
        borderLeft: `4px solid ${accent}`,
      }}
    >
      <p className="text-[10px] font-bold text-[#71787d] uppercase tracking-widest mb-1">
        {label}
      </p>
      <p
        className={[
          "font-black tracking-tighter capitalize",
          small ? "text-xl text-[#223d45]" : "text-3xl",
        ].join(" ")}
        style={!small ? { color: accent } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-bold text-[#41484c] uppercase tracking-widest mb-2">
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-[#71787d] mt-1">{children}</p>;
}
