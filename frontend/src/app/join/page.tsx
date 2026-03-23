"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { connectOnboarding, testConnection, registerAdmin } from "@/lib/api";
import { RefreshCw, CheckCircle2, XCircle, Loader2, Database, Building2, ArrowRight, Wifi, AlertCircle } from "lucide-react";

interface DBFields {
  companyName: string;
  server: string;
  database: string;
  port: string;
  username: string;
  password: string;
}

type Step = "form" | "connecting" | "success" | "error";

function generateTenantId(companyName: string): string {
  const slug = companyName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 20);
  const suffix = Math.random().toString(36).slice(2, 6);
  return slug ? `${slug}_${suffix}` : `empresa_${suffix}`;
}

function buildConnectionString(f: DBFields): string {
  return `Driver={ODBC Driver 18 for SQL Server};Server=tcp:${f.server},${f.port};Database=${f.database};User ID=${f.username};Password=${f.password};Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;`;
}

const INPUT = "w-full border border-brand-light rounded-xl px-4 py-2.5 text-brand-deepest placeholder:text-brand-mid/70 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand-dark transition-all text-sm";
const INPUT_MONO = `${INPUT} font-mono`;

export default function JoinPage() {
  const router = useRouter();
  const { user, role, loading, setMockProfile, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>("form");
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [tenantId, setTenantId] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [testError, setTestError] = useState("");
  const [registering, setRegistering] = useState(false);

  const [fields, setFields] = useState<DBFields>({
    companyName: "",
    server: "",
    database: "",
    port: "1433",
    username: "",
    password: "",
  });

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  // Auto-register as admin if the user has no claims yet (e.g. existing account
  // or silent failure during registration). Forces a token refresh afterwards so
  // subsequent API calls include the new role=admin + tenant_id claims.
  useEffect(() => {
    if (!loading && user && role !== "admin") {
      setRegistering(true);
      registerAdmin()
        .then(() => user.getIdToken(true))
        .then(() => refreshProfile())
        .catch(() => {/* already admin or network error — ignore */})
        .finally(() => setRegistering(false));
    }
  }, [loading, user, role, refreshProfile]);

  useEffect(() => {
    if (fields.companyName.trim()) {
      setTenantId(generateTenantId(fields.companyName));
    } else {
      setTenantId("");
    }
  }, [fields.companyName]);

  const set = (key: keyof DBFields, value: string) => {
    setFields((f) => ({ ...f, [key]: value }));
    setTestStatus("idle");
    setTestError("");
  };

  const handleTest = async () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("connecting");
    setProgress(20);

    try {
      setProgress(50);
      await connectOnboarding({
        company_name: fields.companyName,
        connection_string: buildConnectionString(fields),
        tenant_id: tenantId,
      });
      setProgress(90);

      if (user) {
        await user.getIdToken(true);
        await refreshProfile();
        setMockProfile(user.uid, "admin", tenantId, "active");
      }

      setProgress(100);
      setStep("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al conectar la base de datos.";
      setErrorMsg(msg);
      setStep("error");
    }
  };

  const canTest = !registering && fields.server.trim() && fields.database.trim() && fields.username.trim() && fields.password.trim();
  const canSubmit = !registering && fields.companyName.trim() && tenantId && canTest;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light/20">
      <div className="w-8 h-8 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <main className="min-h-screen p-6 flex items-start justify-center bg-brand-light/10">
      <div className="w-full max-w-2xl mt-8 animate-fade-in">

        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-dark flex items-center justify-center shrink-0 mt-0.5">
                <Building2 size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-brand-deepest">Conecta tu empresa</h1>
                <p className="text-brand-dark/60 text-sm mt-1">
                  Ingresa los datos de tu base de datos Azure SQL.
                </p>
              </div>
            </div>

            {/* Info empresa */}
            <section className="border border-brand-light rounded-2xl p-5 space-y-4 bg-white shadow-card">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-brand-dark" />
                <h2 className="font-semibold text-brand-deepest">Información de la empresa</h2>
              </div>

              <Field label="Nombre de la empresa" required>
                <input
                  type="text"
                  value={fields.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                  placeholder="Contoso Ltd."
                  required
                  className={INPUT}
                />
              </Field>

              <div>
                <label className="block text-sm font-medium text-brand-deepest mb-1.5">
                  ID de tenant{" "}
                  <span className="text-brand-mid font-normal">(generado automáticamente)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tenantId}
                    readOnly
                    placeholder="Se generará al escribir el nombre"
                    className="w-full border border-brand-light rounded-xl px-4 py-2.5 font-mono text-brand-deepest bg-brand-light/30 cursor-default focus:outline-none text-sm"
                  />
                  {tenantId && (
                    <button
                      type="button"
                      onClick={() => setTenantId(generateTenantId(fields.companyName))}
                      title="Regenerar ID"
                      className="shrink-0 p-2.5 border border-brand-light rounded-xl text-brand-mid hover:bg-brand-light hover:text-brand-dark transition-all"
                    >
                      <RefreshCw size={15} />
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Conexión BD */}
            <section className="border border-brand-light rounded-2xl p-5 space-y-4 bg-white shadow-card">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-brand-dark" />
                <div>
                  <h2 className="font-semibold text-brand-deepest">Conexión a base de datos</h2>
                  <p className="text-xs text-brand-mid">Azure SQL Database</p>
                </div>
              </div>

              <Field label="Servidor" required hint="Ej: dataliticsdb.database.windows.net">
                <input
                  type="text"
                  value={fields.server}
                  onChange={(e) => set("server", e.target.value)}
                  placeholder="miservidor.database.windows.net"
                  required
                  className={INPUT_MONO}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Field label="Base de datos" required>
                    <input
                      type="text"
                      value={fields.database}
                      onChange={(e) => set("database", e.target.value)}
                      placeholder="empresa_a"
                      required
                      className={INPUT_MONO}
                    />
                  </Field>
                </div>
                <Field label="Puerto">
                  <input
                    type="text"
                    value={fields.port}
                    onChange={(e) => set("port", e.target.value)}
                    className={INPUT_MONO}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Usuario SQL" required hint="El usuario creado en la BD">
                  <input
                    type="text"
                    value={fields.username}
                    onChange={(e) => set("username", e.target.value)}
                    placeholder="dataagent_user"
                    required
                    className={INPUT}
                  />
                </Field>
                <Field label="Contraseña" required>
                  <input
                    type="password"
                    value={fields.password}
                    onChange={(e) => set("password", e.target.value)}
                    placeholder="••••••••"
                    required
                    className={INPUT}
                  />
                </Field>
              </div>

              {/* Test Connection */}
              <div className="pt-1 flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={!canTest || testStatus === "testing"}
                  className="flex items-center gap-2 border border-brand-mid text-brand-dark px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-light/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {testStatus === "testing" ? (
                    <><Loader2 size={14} className="animate-spin" />Probando...</>
                  ) : (
                    <><Wifi size={14} />Probar conexión</>
                  )}
                </button>

                {testStatus === "ok" && (
                  <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1 font-medium">
                    <CheckCircle2 size={12} />
                    Conexión exitosa {testLatency !== null && `· ${testLatency}ms`}
                  </span>
                )}
                {testStatus === "fail" && (
                  <span className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1 font-medium">
                    <AlertCircle size={12} />
                    {testError || "No se pudo conectar"}
                  </span>
                )}
              </div>
            </section>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2 bg-brand-dark text-white py-3 rounded-xl font-semibold hover:bg-brand-deepest disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-brand hover:shadow-brand-lg"
            >
              Vincular base de datos
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {step === "connecting" && (
          <div className="text-center py-20 space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-brand-dark flex items-center justify-center mx-auto shadow-brand">
              <Database size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-deepest">Conectando tu base de datos</h2>
              <p className="text-brand-dark/60 text-sm mt-1">Inspeccionando esquema y generando configuración...</p>
            </div>
            <div className="w-full bg-brand-light rounded-full h-2 max-w-sm mx-auto overflow-hidden">
              <div className="bg-brand-dark h-2 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-brand-mid">
              <Loader2 size={14} className="animate-spin" />
              Procesando...
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-20 space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-green-100 border-2 border-green-200 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-brand-deepest">Empresa vinculada</h2>
              <p className="text-brand-dark/60 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                Base de datos conectada correctamente. Ya puedes usar DataLitics con tu equipo.
              </p>
            </div>
            <button
              onClick={() => router.push("/home")}
              className="inline-flex items-center gap-2 bg-brand-dark text-white px-8 py-3 rounded-xl font-semibold hover:bg-brand-deepest transition-all shadow-brand"
            >
              Ir al panel <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="text-center py-20 space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-red-100 border-2 border-red-200 rounded-2xl flex items-center justify-center mx-auto">
              <XCircle size={32} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-brand-deepest">Error de conexión</h2>
              <p className="text-brand-dark/60 text-sm mt-2">{errorMsg}</p>
            </div>
            <button
              onClick={() => setStep("form")}
              className="inline-flex items-center gap-2 bg-brand-dark text-white px-8 py-3 rounded-xl font-semibold hover:bg-brand-deepest transition-all shadow-brand"
            >
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-brand-deepest mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-brand-mid mt-1">{hint}</p>}
    </div>
  );
}
