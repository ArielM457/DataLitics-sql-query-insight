"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  generateInviteCode,
  getInviteCodes,
  getPendingUsers,
  updateUserStatus,
  type InviteCode,
  type PendingUser,
} from "@/lib/mocks/users.mock";
import { Key, Users, Copy, Check, UserCheck, UserX, Clock } from "lucide-react";

const EXPIRY_OPTIONS = [
  { label: "15 minutos", ms: 15 * 60 * 1000 },
  { label: "30 minutos", ms: 30 * 60 * 1000 },
  { label: "1 hora", ms: 60 * 60 * 1000 },
  { label: "4 horas", ms: 4 * 60 * 60 * 1000 },
  { label: "24 horas", ms: 24 * 60 * 60 * 1000 },
];

export default function AdminPage() {
  const router = useRouter();
  const { user, loading, role, tenantId, setMockProfile } = useAuth();

  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [expiryMs, setExpiryMs] = useState(EXPIRY_OPTIONS[2].ms);
  const [newCode, setNewCode] = useState<InviteCode | null>(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"codes" | "users">("codes");

  const companyName = pending[0]?.companyName ?? tenantId ?? "Tu empresa";

  const refresh = useCallback(() => {
    if (!tenantId) return;
    setCodes(getInviteCodes(tenantId));
    setPending(getPendingUsers(tenantId));
  }, [tenantId]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/"); return; }
    if (role !== "admin") { router.replace("/home"); return; }
    refresh();
  }, [user, loading, role, router, refresh]);

  const handleGenerate = () => {
    if (!tenantId) return;
    const code = generateInviteCode(tenantId, companyName, expiryMs);
    setNewCode(code);
    refresh();
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApprove = (pendingUser: PendingUser) => {
    updateUserStatus(pendingUser.uid, "approved");
    setMockProfile(pendingUser.uid, "analyst", pendingUser.tenantId, "active");
    refresh();
  };

  const handleReject = (uid: string) => {
    updateUserStatus(uid, "rejected");
    refresh();
  };

  const isExpired = (code: InviteCode) => Date.now() > code.expiresAt;
  const timeLeft = (expiresAt: number) => {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return "Expirado";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light/20">
      <div className="w-8 h-8 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const activePending = pending.filter((u) => u.status === "pending");

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-deepest">Panel de administración</h1>
        <p className="text-brand-dark/60 text-sm mt-1">
          Gestiona el acceso de tu equipo a DataLitics ·{" "}
          <span className="font-mono text-brand-dark">{tenantId}</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-light">
        <TabBtn active={tab === "codes"} onClick={() => setTab("codes")} icon={Key}>
          Códigos de invitación
        </TabBtn>
        <TabBtn active={tab === "users"} onClick={() => setTab("users")} icon={Users}>
          Solicitudes pendientes
          {activePending.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-semibold">
              {activePending.length}
            </span>
          )}
        </TabBtn>
      </div>

      {/* ── Tab: Códigos ── */}
      {tab === "codes" && (
        <div className="space-y-6">
          <div className="border border-brand-light rounded-2xl p-5 space-y-4 bg-white shadow-card">
            <h2 className="font-semibold text-brand-deepest">Generar código de invitación</h2>
            <p className="text-sm text-brand-dark/60">
              Comparte este código con un empleado para que pueda solicitar acceso.
              El código expira automáticamente y solo puede usarse una vez.
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm text-brand-deepest font-medium">Duración:</label>
              <select
                value={expiryMs}
                onChange={(e) => setExpiryMs(Number(e.target.value))}
                className="border border-brand-light rounded-xl px-3 py-1.5 text-sm text-brand-deepest focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand-dark transition-all"
              >
                {EXPIRY_OPTIONS.map((o) => (
                  <option key={o.ms} value={o.ms}>{o.label}</option>
                ))}
              </select>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1.5 bg-brand-dark text-white px-4 py-1.5 rounded-xl text-sm font-medium hover:bg-brand-deepest transition-all"
              >
                <Key size={14} />
                Generar código
              </button>
            </div>

            {newCode && (
              <div className="bg-brand-light/40 border border-brand-light rounded-2xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-brand-dark font-semibold mb-1">Nuevo código generado</p>
                  <p className="text-3xl font-bold font-mono tracking-[0.3em] text-brand-deepest">
                    {newCode.code}
                  </p>
                  <p className="text-xs text-brand-mid mt-1 flex items-center gap-1">
                    <Clock size={11} />
                    Expira en: {timeLeft(newCode.expiresAt)}
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(newCode.code)}
                  className="flex items-center gap-1.5 border border-brand-mid text-brand-dark px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-light transition-all shrink-0"
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            )}
          </div>

          {/* Lista de códigos */}
          <div className="border border-brand-light rounded-2xl overflow-hidden bg-white shadow-card">
            <div className="px-5 py-3 border-b border-brand-light bg-brand-light/20">
              <h2 className="font-semibold text-brand-deepest text-sm">Códigos generados</h2>
            </div>
            {codes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-brand-mid">
                <Key size={24} />
                <p className="text-sm">No hay códigos generados aún.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-light bg-brand-light/10">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-brand-dark uppercase tracking-wide">Código</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-brand-dark uppercase tracking-wide">Estado</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-brand-dark uppercase tracking-wide">Tiempo restante</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((c) => (
                    <tr key={c.code} className="border-t border-brand-light/50 hover:bg-brand-light/20 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold tracking-widest text-brand-deepest">{c.code}</td>
                      <td className="px-5 py-3">
                        {c.used ? (
                          <Badge color="gray">Usado</Badge>
                        ) : isExpired(c) ? (
                          <Badge color="red">Expirado</Badge>
                        ) : (
                          <Badge color="green">Activo</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-brand-mid">{timeLeft(c.expiresAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Solicitudes ── */}
      {tab === "users" && (
        <div className="border border-brand-light rounded-2xl overflow-hidden bg-white shadow-card">
          {pending.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-brand-mid">
              <Users size={28} />
              <p className="text-sm">No hay solicitudes pendientes.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-light bg-brand-light/20">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-brand-dark uppercase tracking-wide">Usuario</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-brand-dark uppercase tracking-wide">Empresa</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-brand-dark uppercase tracking-wide">Estado</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-brand-dark uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((u) => (
                  <tr key={u.uid} className="border-t border-brand-light/50 hover:bg-brand-light/20 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-brand-deepest">{u.name}</p>
                      <p className="text-brand-mid text-xs mt-0.5">{u.email}</p>
                    </td>
                    <td className="px-5 py-4 text-brand-dark/70">{u.companyName}</td>
                    <td className="px-5 py-4">
                      {u.status === "pending" && <Badge color="amber">Pendiente</Badge>}
                      {u.status === "approved" && <Badge color="green">Aprobado</Badge>}
                      {u.status === "rejected" && <Badge color="red">Rechazado</Badge>}
                    </td>
                    <td className="px-5 py-4">
                      {u.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(u)}
                            className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors"
                          >
                            <UserCheck size={12} />
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleReject(u.uid)}
                            className="flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                          >
                            <UserX size={12} />
                            Rechazar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </main>
  );
}

function TabBtn({
  active, onClick, children, icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ElementType;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 pb-3 text-sm font-medium flex items-center gap-1.5 transition-colors relative ${
        active ? "text-brand-dark" : "text-brand-mid hover:text-brand-dark"
      }`}
    >
      <Icon size={14} />
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-dark rounded-full" />
      )}
    </button>
  );
}

function Badge({ color, children }: { color: "green" | "red" | "amber" | "gray"; children: React.ReactNode }) {
  const cls = {
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    gray: "bg-brand-light text-brand-mid",
  }[color];
  return <span className={`${cls} text-xs font-semibold px-2.5 py-0.5 rounded-full`}>{children}</span>;
}
