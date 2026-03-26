"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import {
  getAdminAllowedTables,
  updateAdminAllowedTables,
  connectOnboarding,
} from "@/lib/api";
import {
  Loader2, ShieldOff, ShieldCheck, Plus, X, Eye, EyeOff,
  Lock, ArrowRight, RefreshCw, AlertCircle, CheckCircle2, Database,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────────── */

interface DBFields {
  server: string;
  database: string;
  port: string;
  username: string;
  password: string;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────────── */

function setsEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  return b.every((x) => sa.has(x));
}

function buildConnectionString(f: DBFields): string {
  return `Driver={ODBC Driver 18 for SQL Server};Server=tcp:${f.server},${f.port};Database=${f.database};User ID=${f.username};Password=${f.password};Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;`;
}

const INPUT_BASE =
  "w-full bg-white border border-brand-light rounded-xl px-4 py-2.5 text-sm " +
  "focus:ring-2 focus:ring-brand-dark/10 focus:border-brand-dark transition-all " +
  "outline-none placeholder:text-brand-mid/60 disabled:opacity-40 disabled:cursor-not-allowed";

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function DatabaseManagement() {
  const { user, tenantId } = useAuth();

  /* ── Sub-section ── */
  const [section, setSection] = useState<"config" | "reconnect">("config");

  /* ── Tables ── */
  const [allTables, setAllTables] = useState<string[]>([]);
  const [allowedTables, setAllowedTables] = useState<string[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [tablesSaving, setTablesSaving] = useState(false);
  const [tablesSaved, setTablesSaved] = useState(false);

  /* ── Password modal ── */
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  /* ── Table selection popup ── */
  const [showTableModal, setShowTableModal] = useState(false);
  const [modalBlacklist, setModalBlacklist] = useState<string[]>([]);

  /* ── Reconnect form ── */
  const [reconnectFields, setReconnectFields] = useState<DBFields>({
    server: "", database: "", port: "1433", username: "", password: "",
  });
  const [showReconnectPassword, setShowReconnectPassword] = useState(false);
  const [reconnectLoading, setReconnectLoading] = useState(false);
  const [reconnectResult, setReconnectResult] = useState<{ tables_found: number } | null>(null);
  const [reconnectError, setReconnectError] = useState<string | null>(null);

  /* ── Derived ── */
  const blacklistedTables = allTables.filter((t) => !allowedTables.includes(t));
  const modalIsDirty = !setsEqual(modalBlacklist, blacklistedTables);

  /* ── Load ── */
  const loadTables = useCallback(async () => {
    setTablesLoading(true);
    setTablesError(null);
    try {
      const data = await getAdminAllowedTables();
      setAllTables(data.all_tables);
      setAllowedTables(data.allowed_tables);
    } catch {
      setTablesError("No se pudo cargar la configuración de tablas.");
    } finally {
      setTablesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  /* ── Password modal ── */
  const openPasswordModal = () => {
    setPasswordValue("");
    setPasswordError(null);
    setShowPasswordModal(true);
  };

  const handlePasswordVerify = async () => {
    if (!user?.email) return;
    setPasswordLoading(true);
    setPasswordError(null);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordValue);
      await reauthenticateWithCredential(user, credential);
      setShowPasswordModal(false);
      setPasswordValue("");
      setModalBlacklist([...blacklistedTables]);
      setShowTableModal(true);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setPasswordError("Contraseña incorrecta. Inténtalo de nuevo.");
      } else if (code === "auth/too-many-requests") {
        setPasswordError("Demasiados intentos. Espera unos minutos.");
      } else if (code === "auth/operation-not-allowed") {
        setPasswordError("Este método de inicio de sesión no admite contraseña (ej. Google).");
      } else {
        setPasswordError("Error de verificación. Comprueba tu contraseña.");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  /* ── Table modal ── */
  const toggleModalTable = (table: string) => {
    setModalBlacklist((prev) =>
      prev.includes(table) ? prev.filter((t) => t !== table) : [...prev, table]
    );
  };

  const handleSaveRestrictions = async () => {
    setTablesSaving(true);
    setTablesError(null);
    try {
      const newAllowed = allTables.filter((t) => !modalBlacklist.includes(t));
      await updateAdminAllowedTables(newAllowed);
      setAllowedTables(newAllowed);
      setShowTableModal(false);
      setTablesSaved(true);
      setTimeout(() => setTablesSaved(false), 3000);
    } catch {
      setTablesError("Error al guardar las restricciones.");
    } finally {
      setTablesSaving(false);
    }
  };

  /* ── Reconnect ── */
  const setReconnect = (key: keyof DBFields, value: string) =>
    setReconnectFields((f) => ({ ...f, [key]: value }));

  const canReconnect = !!(
    reconnectFields.server.trim() &&
    reconnectFields.database.trim() &&
    reconnectFields.username.trim() &&
    reconnectFields.password.trim() &&
    tenantId
  );

  const handleReconnect = async () => {
    if (!canReconnect || !tenantId) return;
    setReconnectLoading(true);
    setReconnectError(null);
    setReconnectResult(null);
    try {
      const companyDisplay = tenantId.replace(/_[a-z0-9]{4}$/, "").replace(/_/g, " ");
      const data = await connectOnboarding({
        company_name: companyDisplay,
        connection_string: buildConnectionString(reconnectFields),
        tenant_id: tenantId,
      });
      setReconnectResult(data);
      await loadTables();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error de conexión. Verifica las credenciales.";
      setReconnectError(msg);
    } finally {
      setReconnectLoading(false);
    }
  };

  /* ══════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════ */
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-deepest">Base de datos</h1>
        <p className="text-brand-dark/60 text-sm mt-1">
          Gestiona la conexión y el control de acceso a las tablas ·{" "}
          <span className="font-mono text-brand-dark">{tenantId}</span>
        </p>
      </div>

      {/* Sub-section nav */}
      <div className="flex gap-1 p-1 bg-brand-light/40 rounded-xl w-fit">
        <SubNavBtn active={section === "config"} onClick={() => setSection("config")}>
          Configuración
        </SubNavBtn>
        <SubNavBtn active={section === "reconnect"} onClick={() => setSection("reconnect")}>
          Reconexión
        </SubNavBtn>
      </div>

      {/* ── Configuración ── */}
      {section === "config" && (
        <div className="space-y-5">
          <div className="border border-brand-light rounded-2xl p-5 bg-white shadow-card space-y-1">
            <h2 className="font-semibold text-brand-deepest">Tablas restringidas</h2>
            <p className="text-sm text-brand-dark/60">
              Las tablas marcadas como restringidas están completamente bloqueadas para el agente.
              Ningún analista puede acceder a su contenido, sin importar la pregunta que haga.
            </p>
          </div>

          {tablesLoading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 size={22} className="animate-spin text-brand-dark" />
            </div>
          ) : allTables.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-brand-mid border border-brand-light rounded-2xl bg-white">
              <Database size={28} />
              <div className="text-center">
                <p className="text-sm font-medium">No hay base de datos conectada.</p>
                <p className="text-xs text-brand-mid/70 mt-1">
                  Ve a la sección <button onClick={() => setSection("reconnect")} className="underline text-brand-dark font-medium">Reconexión</button> para conectar una base de datos.
                </p>
              </div>
            </div>
          ) : (
            <div className="border border-brand-light rounded-2xl overflow-hidden bg-white shadow-card">
              {/* Card header */}
              <div className="px-5 py-4 border-b border-brand-light bg-brand-light/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldOff size={14} className="text-red-500" />
                  <span className="text-sm font-semibold text-brand-deepest">
                    {blacklistedTables.length === 0
                      ? "Sin restricciones activas"
                      : `${blacklistedTables.length} tabla${blacklistedTables.length !== 1 ? "s" : ""} restringida${blacklistedTables.length !== 1 ? "s" : ""}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={openPasswordModal}
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-dark border border-brand-light bg-white hover:bg-brand-light/40 px-3 py-1.5 rounded-lg transition-all"
                >
                  <Plus size={13} />
                  Gestionar restricciones
                </button>
              </div>

              {/* Blacklist content */}
              {blacklistedTables.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-brand-mid">
                  <ShieldCheck size={26} className="text-green-500" />
                  <p className="text-sm font-medium text-green-700">
                    Todas las tablas están habilitadas para el agente.
                  </p>
                  <p className="text-xs text-brand-mid/70">
                    {allTables.length} tabla{allTables.length !== 1 ? "s" : ""} disponible{allTables.length !== 1 ? "s" : ""} · ninguna restringida
                  </p>
                </div>
              ) : (
                <div className="p-5 flex flex-wrap gap-2">
                  {blacklistedTables.map((table) => (
                    <span
                      key={table}
                      className="inline-flex items-center gap-1.5 font-mono text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg"
                    >
                      <ShieldOff size={11} />
                      {table}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="px-5 py-3 border-t border-brand-light bg-brand-light/10 flex items-center justify-between text-xs text-brand-dark/60">
                <span>
                  <span className="font-semibold text-brand-deepest">{allowedTables.length}</span> de{" "}
                  {allTables.length} tablas habilitadas para el agente
                </span>
                {tablesSaved && (
                  <span className="flex items-center gap-1 text-green-700 font-semibold">
                    <CheckCircle2 size={13} />
                    Cambios guardados
                  </span>
                )}
              </div>
            </div>
          )}

          {tablesError && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              {tablesError}
            </div>
          )}
        </div>
      )}

      {/* ── Reconexión ── */}
      {section === "reconnect" && (
        <div className="space-y-5">
          <div className="border border-brand-light rounded-2xl p-5 bg-white shadow-card space-y-1">
            <h2 className="font-semibold text-brand-deepest">Reconectar base de datos</h2>
            <p className="text-sm text-brand-dark/60">
              Actualiza las credenciales de conexión. Esto reemplazará la configuración actual
              e inspeccionará el esquema nuevamente. Las restricciones de tablas se mantendrán.
            </p>
          </div>

          <div className="border border-brand-light rounded-2xl p-6 bg-white shadow-card">
            {reconnectResult ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={22} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-brand-deepest text-sm">Reconexión exitosa</p>
                    <p className="text-xs text-brand-mid">
                      {reconnectResult.tables_found} tabla{reconnectResult.tables_found !== 1 ? "s" : ""} encontrada{reconnectResult.tables_found !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReconnectResult(null);
                    setReconnectFields({ server: "", database: "", port: "1433", username: "", password: "" });
                  }}
                  className="flex items-center gap-2 border border-brand-light text-brand-dark px-5 py-2 rounded-xl text-sm font-semibold hover:bg-brand-light/40 transition-all"
                >
                  <RefreshCw size={14} />
                  Nueva reconexión
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <FormLabel>Host / Servidor</FormLabel>
                  <input
                    type="text"
                    value={reconnectFields.server}
                    onChange={(e) => setReconnect("server", e.target.value)}
                    placeholder="servidor.database.windows.net"
                    disabled={reconnectLoading}
                    className={INPUT_BASE + " font-mono"}
                  />
                </div>
                <div>
                  <FormLabel>Base de datos</FormLabel>
                  <input
                    type="text"
                    value={reconnectFields.database}
                    onChange={(e) => setReconnect("database", e.target.value)}
                    placeholder="empresa_db"
                    disabled={reconnectLoading}
                    className={INPUT_BASE + " font-mono"}
                  />
                </div>
                <div>
                  <FormLabel>Puerto</FormLabel>
                  <input
                    type="text"
                    value={reconnectFields.port}
                    onChange={(e) => setReconnect("port", e.target.value)}
                    disabled={reconnectLoading}
                    className={INPUT_BASE + " font-mono"}
                  />
                </div>
                <div>
                  <FormLabel>Usuario SQL</FormLabel>
                  <input
                    type="text"
                    value={reconnectFields.username}
                    onChange={(e) => setReconnect("username", e.target.value)}
                    placeholder="dataagent_user"
                    disabled={reconnectLoading}
                    className={INPUT_BASE}
                  />
                </div>
                <div>
                  <FormLabel>Contraseña</FormLabel>
                  <div className="relative">
                    <input
                      type={showReconnectPassword ? "text" : "password"}
                      value={reconnectFields.password}
                      onChange={(e) => setReconnect("password", e.target.value)}
                      placeholder="••••••••••"
                      disabled={reconnectLoading}
                      className={INPUT_BASE + " pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowReconnectPassword(!showReconnectPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-mid hover:text-brand-dark"
                    >
                      {showReconnectPassword ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                  </div>
                </div>

                {reconnectError && (
                  <div className="md:col-span-2 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    {reconnectError}
                  </div>
                )}

                <div className="md:col-span-2 flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleReconnect}
                    disabled={!canReconnect || reconnectLoading}
                    className="flex items-center gap-2 bg-brand-dark text-white px-7 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-deepest disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {reconnectLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {reconnectLoading ? "Conectando..." : "Reconectar"}
                    {!reconnectLoading && <ArrowRight size={14} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          PASSWORD MODAL
          ═══════════════════════════════════════════════════════ */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { setShowPasswordModal(false); setPasswordValue(""); setPasswordError(null); }}
          />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-5">
            <button
              type="button"
              onClick={() => { setShowPasswordModal(false); setPasswordValue(""); setPasswordError(null); }}
              className="absolute top-4 right-4 text-brand-mid hover:text-brand-deepest transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center shrink-0">
                <Lock size={18} className="text-brand-dark" />
              </div>
              <div>
                <h3 className="font-bold text-brand-deepest text-sm">Verificación requerida</h3>
                <p className="text-xs text-brand-mid">Confirma tu identidad para continuar</p>
              </div>
            </div>

            <div className="text-xs text-brand-dark/70 bg-brand-light/40 rounded-lg px-3 py-2">
              Cuenta: <span className="font-semibold font-mono">{user?.email}</span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-brand-dark uppercase tracking-widest mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordValue}
                  onChange={(e) => { setPasswordValue(e.target.value); setPasswordError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && passwordValue && handlePasswordVerify()}
                  placeholder="Ingresa tu contraseña"
                  autoFocus
                  className={INPUT_BASE + " pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-mid hover:text-brand-dark"
                >
                  {showPassword ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>
              {passwordError && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} />
                  {passwordError}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowPasswordModal(false); setPasswordValue(""); setPasswordError(null); }}
                className="flex-1 border border-brand-light text-brand-dark px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-light/40 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePasswordVerify}
                disabled={!passwordValue || passwordLoading}
                className="flex-1 flex items-center justify-center gap-2 bg-brand-dark text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-deepest disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {passwordLoading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                {passwordLoading ? "Verificando..." : "Continuar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TABLE SELECTION POPUP
          ═══════════════════════════════════════════════════════ */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-brand-light flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShieldOff size={16} className="text-red-500" />
                <h3 className="font-bold text-brand-deepest text-sm">Gestionar restricciones de tablas</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="text-brand-mid hover:text-brand-deepest transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Info banner */}
            <div className="px-6 pt-4 pb-2 shrink-0">
              <p className="text-xs text-brand-dark/70 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                Las tablas <strong>marcadas</strong> quedarán <strong className="text-red-700">restringidas</strong> — el agente no tendrá acceso a ellas bajo ninguna circunstancia.
              </p>
            </div>

            {/* Toggle all */}
            <div className="px-6 py-2 flex items-center justify-between shrink-0 border-b border-brand-light/60">
              <span className="text-xs text-brand-dark/60">
                <span className="font-bold text-brand-deepest">{modalBlacklist.length}</span> de {allTables.length} tablas restringidas
              </span>
              <button
                type="button"
                onClick={() => setModalBlacklist(modalBlacklist.length === allTables.length ? [] : [...allTables])}
                className="text-xs font-semibold text-brand-dark hover:underline"
              >
                {modalBlacklist.length === allTables.length ? "Liberar todas" : "Restringir todas"}
              </button>
            </div>

            {/* Table rows */}
            <div className="overflow-y-auto flex-1 divide-y divide-brand-light">
              {allTables.map((table) => {
                const isRestricted = modalBlacklist.includes(table);
                return (
                  <label
                    key={table}
                    className={[
                      "flex items-center gap-3 px-6 py-3.5 cursor-pointer transition-colors select-none",
                      isRestricted ? "bg-red-50/60 hover:bg-red-50" : "hover:bg-brand-light/20",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={isRestricted}
                      onChange={() => toggleModalTable(table)}
                      className="w-4 h-4 accent-red-600 cursor-pointer"
                    />
                    <span className="flex-1 font-mono text-sm font-medium text-brand-deepest">{table}</span>
                    {isRestricted ? (
                      <span className="text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full uppercase">
                        Restringida
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full uppercase">
                        Habilitada
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-brand-light flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="border border-brand-light text-brand-dark px-5 py-2 rounded-xl text-sm font-semibold hover:bg-brand-light/40 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveRestrictions}
                disabled={!modalIsDirty || tablesSaving || allTables.length === modalBlacklist.length}
                className="flex items-center gap-2 bg-brand-dark text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-brand-deepest disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {tablesSaving ? <Loader2 size={14} className="animate-spin" /> : <ShieldOff size={14} />}
                {tablesSaving ? "Guardando..." : "Guardar restricciones"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Small components ────────────────────────────────────────────────────────── */

function SubNavBtn({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        active ? "bg-white text-brand-deepest shadow-sm" : "text-brand-mid hover:text-brand-dark"
      }`}
    >
      {children}
    </button>
  );
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-bold text-brand-dark uppercase tracking-widest mb-1.5">
      {children}
    </label>
  );
}
