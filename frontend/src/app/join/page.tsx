"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { connectOnboarding, testConnection } from "@/lib/api";
import { RefreshCw, CheckCircle2, XCircle, Loader2, Database, Building2, ArrowRight, Wifi, AlertCircle } from "lucide-react";

interface DBFields {
  companyName: string;
  server: string;
  database: string;
  username: string;
  password: string;
  port: string;
  encrypt: boolean;
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

const INPUT = "w-full border border-brand-light rounded-xl px-4 py-2.5 text-brand-deepest placeholder:text-brand-mid/70 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand-dark transition-all text-sm";
const INPUT_MONO = `${INPUT} font-mono`;

export default function JoinPage() {
  const router = useRouter();
  const { user, loading, setMockProfile } = useAuth();
  const [step, setStep] = useState<Step>("form");
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [tenantId, setTenantId] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [testLatency, setTestLatency] = useState<number | null>(null);

  const [fields, setFields] = useState<DBFields>({
    companyName: "",
    server: "",
    database: "",
    username: "",
    password: "",
    port: "1433",
    encrypt: true,
  });

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (fields.companyName.trim()) {
      setTenantId(generateTenantId(fields.companyName));
    } else {
      setTenantId("");
    }
  }, [fields.companyName]);

  const set = (key: keyof DBFields, value: string | boolean) => {
    setFields((f) => ({ ...f, [key]: value }));
    setTestStatus("idle");
  };

  const buildConnectionString = () =>
    `Server=tcp:${fields.server},${fields.port};Database=${fields.database};User ID=${fields.username};Password=${fields.password};Encrypt=${fields.encrypt ? "yes" : "no"};TrustServerCertificate=no;Connection Timeout=30;`;

  const handleTest = async () => {
    const cs = buildConnectionString();
    setTestStatus("testing");
    setTestLatency(null);
    try {
      const res = await testConnection(cs);
      setTestLatency(res.latency_ms);
      setTestStatus("ok");
    } catch {
      setTestStatus("fail");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("connecting");
    setProgress(20);

    try {
      const connectionString = buildConnectionString();
      setProgress(50);

      await connectOnboarding({
        company_name: fields.companyName,
        connection_string: connectionString,
        tenant_id: tenantId,
      });

      setProgress(100);

      if (user) {
        setMockProfile(user.uid, "admin", tenantId, "active");
      }

      setStep("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al conectar la base de datos.";
      setErrorMsg(msg);
      setStep("error");
    }
  };

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
                  Ingresa los datos de tu base de datos Azure SQL. DataLitics la inspeccionará y
                  configurará el entorno automáticamente.
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
                <p className="text-xs text-brand-mid mt-1">
                  Este ID identifica de forma única a tu empresa en el sistema.
                </p>
              </div>
            </section>

            {/* Conexión BD */}
            <section className="border border-brand-light rounded-2xl p-5 space-y-4 bg-white shadow-card">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-brand-dark" />
                <div>
                  <h2 className="font-semibold text-brand-deepest">Conexión a base de datos</h2>
                  <p className="text-xs text-brand-mid">Azure SQL Database (SQL Server compatible)</p>
                </div>
              </div>

              <Field label="Servidor" required hint="Ej: mi-servidor.database.windows.net">
                <input
                  type="text"
                  value={fields.server}
                  onChange={(e) => set("server", e.target.value)}
                  placeholder="mi-servidor.database.windows.net"
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
                      placeholder="mi_base_de_datos"
                      required
                      className={INPUT_MONO}
                    />
                  </Field>
                </div>
                <Field label="Puerto">
                  <input
                    type="number"
                    value={fields.port}
                    onChange={(e) => set("port", e.target.value)}
                    className={INPUT_MONO}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Usuario" required>
                  <input
                    type="text"
                    value={fields.username}
                    onChange={(e) => set("username", e.target.value)}
                    placeholder="sqladmin"
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

              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={fields.encrypt}
                  onChange={(e) => set("encrypt", e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-dark"
                />
                <span className="text-sm text-brand-deepest group-hover:text-brand-dark transition-colors">
                  Cifrar conexión (recomendado para Azure SQL)
                </span>
              </label>

              {/* Test Connection */}
              <div className="pt-1">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={!fields.server || !fields.database || !fields.username || !fields.password || testStatus === "testing"}
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
                      No se pudo conectar
                    </span>
                  )}
                </div>
              </div>
            </section>

            {/* Preview connection string */}
            {fields.server && fields.database && (
              <div className="bg-brand-deepest rounded-2xl p-4">
                <p className="text-xs text-brand-mid mb-2 font-medium">Connection string generada:</p>
                <p className="text-xs text-green-400 font-mono break-all leading-relaxed">{buildConnectionString()}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!fields.companyName || !tenantId || !fields.server || !fields.database || !fields.username || !fields.password}
              className="w-full flex items-center justify-center gap-2 bg-brand-dark text-white py-3 rounded-xl font-semibold hover:bg-brand-deepest disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-brand hover:shadow-brand-lg"
            >
              Vincular base de datos
              <ArrowRight size={18} />
            </button>

            <p className="text-xs text-brand-mid text-center">
              Después de vincular recibirás las instrucciones de despliegue por email.
            </p>
          </form>
        )}

        {step === "connecting" && (
          <div className="text-center py-20 space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-brand-dark flex items-center justify-center mx-auto shadow-brand animate-float">
              <Database size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-deepest">Conectando tu base de datos</h2>
              <p className="text-brand-dark/60 text-sm mt-1">
                Inspeccionando esquema, detectando columnas sensibles y generando configuración...
              </p>
            </div>
            <div className="w-full bg-brand-light rounded-full h-2 max-w-sm mx-auto overflow-hidden">
              <div
                className="bg-brand-dark h-2 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-brand-mid">
              <Loader2 size={14} className="animate-spin" />
              Procesando...
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-20 space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-green-100 border-2 border-green-200 rounded-2xl flex items-center justify-center mx-auto animate-float">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-brand-deepest">Empresa vinculada</h2>
              <p className="text-brand-dark/60 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                Hemos enviado las instrucciones de despliegue a tu email. Una vez desplegado,
                podrás empezar a usar DataLitics con tu equipo.
              </p>
            </div>
            <button
              onClick={() => router.push("/home")}
              className="inline-flex items-center gap-2 bg-brand-dark text-white px-8 py-3 rounded-xl font-semibold hover:bg-brand-deepest transition-all shadow-brand"
            >
              Ir al panel
              <ArrowRight size={18} />
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

function Field({
  label, required, hint, children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
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
