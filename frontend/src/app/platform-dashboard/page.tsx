"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getPlatformUsers, getPlatformCompanies } from "@/lib/api";
import {
  getSkillRequests,
  updateSkillRequestStatus,
  type SkillRequest,
  type SkillRequestStatus,
} from "@/lib/skillRequests";
import {
  Building2,
  Users,
  Sparkles,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface Company {
  tenant_id: string;
  company_name: string;
  user_count: number;
}

interface AppUser {
  uid: string;
  email: string;
  name: string;
  tenant_id: string;
  company_name: string;
  requested_at: number;
  status: string;
}

type Section = "overview" | "companies" | "users" | "skills";

export default function PlatformDashboard() {
  const router = useRouter();
  const { user, loading, role } = useAuth();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [skillRequests, setSkillRequests] = useState<SkillRequest[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("overview");

  const refresh = useCallback(async () => {
    setDataLoading(true);
    try {
      const [companiesData, usersData, skillData] = await Promise.all([
        getPlatformCompanies(),
        getPlatformUsers(),
        getSkillRequests(),
      ]);
      setCompanies(companiesData);
      setUsers(usersData);
      setSkillRequests(skillData);
    } catch {
      // fail silently — cards will show zeros
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/"); return; }
    if (role !== "platform_admin") { router.replace("/home"); return; }
    refresh();
  }, [user, loading, role, router, refresh]);

  const handleSkillStatus = async (id: string, status: SkillRequestStatus) => {
    setActionLoading(`skill_${id}`);
    try {
      await updateSkillRequestStatus(id, status);
      setSkillRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
        <Loader2 size={28} className="animate-spin text-white/40" />
      </div>
    );
  }

  const pendingSkills = skillRequests.filter((r) => r.status === "pending");
  const activeUsers = users.filter((u) => u.status === "approved");
  const totalPending = users.filter((u) => u.status === "pending").length;

  const NAV: { id: Section; label: string }[] = [
    { id: "overview", label: "Resumen" },
    { id: "companies", label: "Empresas" },
    { id: "users", label: "Usuarios" },
    { id: "skills", label: "Skills" },
  ];

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      {/* ── Top bar ── */}
      <header className="bg-[#0a1628] border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <LayoutDashboard size={15} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">DataLitics</p>
              <p className="text-white/40 text-xs mt-0.5">Platform Admin</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setSection(n.id)}
                className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  section === n.id
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                {n.label}
                {n.id === "skills" && pendingSkills.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {pendingSkills.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={dataLoading}
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
              title="Actualizar datos"
            >
              <RefreshCw size={15} className={dataLoading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <LogOut size={14} />
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-6">

        {/* ─── Overview ─── */}
        {section === "overview" && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Resumen de la plataforma</h1>
              <p className="text-slate-500 text-sm mt-1">Vista general de todas las empresas, usuarios y solicitudes</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon={Building2}
                iconColor="text-blue-600"
                iconBg="bg-blue-50"
                label="Empresas"
                value={dataLoading ? "…" : String(companies.length)}
                sub="en la plataforma"
                onClick={() => setSection("companies")}
              />
              <StatCard
                icon={Users}
                iconColor="text-violet-600"
                iconBg="bg-violet-50"
                label="Usuarios"
                value={dataLoading ? "…" : String(users.length)}
                sub={`${activeUsers.length} activos · ${totalPending} pendientes`}
                onClick={() => setSection("users")}
              />
              <StatCard
                icon={Sparkles}
                iconColor="text-amber-600"
                iconBg="bg-amber-50"
                label="Solicitudes de Skills"
                value={dataLoading ? "…" : String(skillRequests.length)}
                sub={`${pendingSkills.length} pendiente${pendingSkills.length !== 1 ? "s" : ""}`}
                onClick={() => setSection("skills")}
                badge={pendingSkills.length > 0 ? pendingSkills.length : undefined}
              />
            </div>

            {/* Pending skills alert */}
            {pendingSkills.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-600" />
                    <p className="font-semibold text-amber-800 text-sm">
                      {pendingSkills.length} solicitud{pendingSkills.length !== 1 ? "es" : ""} de skill pendiente{pendingSkills.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button onClick={() => setSection("skills")} className="text-xs text-amber-700 font-semibold hover:underline">
                    Ver todas →
                  </button>
                </div>
                {pendingSkills.slice(0, 3).map((req) => (
                  <div key={req.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-100 gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{req.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{req.user_email} · {req.tenant_id}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleSkillStatus(req.id, "approved")}
                        disabled={actionLoading === `skill_${req.id}`}
                        className="flex items-center gap-1 bg-green-600 text-white px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {actionLoading === `skill_${req.id}` ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleSkillStatus(req.id, "rejected")}
                        disabled={actionLoading === `skill_${req.id}`}
                        className="flex items-center gap-1 bg-white text-red-600 border border-red-200 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        <XCircle size={10} />
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── Companies ─── */}
        {section === "companies" && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Empresas</h1>
              <p className="text-slate-500 text-sm mt-1">{companies.length} empresa{companies.length !== 1 ? "s" : ""} registrada{companies.length !== 1 ? "s" : ""} en la plataforma</p>
            </div>

            {dataLoading ? (
              <LoadingCard />
            ) : companies.length === 0 ? (
              <EmptyCard icon={Building2} text="No hay empresas registradas aún." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {companies.map((c) => (
                  <div key={c.tenant_id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-sm transition-all">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-50 p-2.5 rounded-xl shrink-0">
                        <Building2 size={18} className="text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{c.company_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">{c.tenant_id}</p>
                        <p className="text-xs text-slate-500 mt-2">
                          <span className="font-semibold text-slate-700">{c.user_count}</span> usuario{c.user_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── Users ─── */}
        {section === "users" && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Usuarios en la app</h1>
              <p className="text-slate-500 text-sm mt-1">
                {users.length} usuario{users.length !== 1 ? "s" : ""} · {activeUsers.length} activo{activeUsers.length !== 1 ? "s" : ""} · {totalPending} pendiente{totalPending !== 1 ? "s" : ""}
              </p>
            </div>

            {dataLoading ? (
              <LoadingCard />
            ) : users.length === 0 ? (
              <EmptyCard icon={Users} text="No hay usuarios registrados aún." />
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuario</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Empresa</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800">{u.name || "—"}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{u.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-600">{u.company_name}</p>
                          <p className="text-slate-400 text-xs font-mono mt-0.5">{u.tenant_id}</p>
                        </td>
                        <td className="px-6 py-4">
                          {u.status === "pending" && <StatusBadge color="amber">Pendiente</StatusBadge>}
                          {u.status === "approved" && <StatusBadge color="green">Activo</StatusBadge>}
                          {u.status === "rejected" && <StatusBadge color="red">Rechazado</StatusBadge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ─── Skills ─── */}
        {section === "skills" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Solicitudes de Skills</h1>
                <p className="text-slate-500 text-sm mt-1">
                  {skillRequests.length} solicitud{skillRequests.length !== 1 ? "es" : ""} en total · {pendingSkills.length} pendiente{pendingSkills.length !== 1 ? "s" : ""}
                </p>
              </div>
              {pendingSkills.length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">
                  {pendingSkills.length} pendiente{pendingSkills.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {dataLoading ? (
              <LoadingCard />
            ) : skillRequests.length === 0 ? (
              <EmptyCard icon={Sparkles} text="No hay solicitudes de skills aún." />
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                {skillRequests.map((req) => (
                  <SkillRequestRow
                    key={req.id}
                    request={req}
                    loading={actionLoading === `skill_${req.id}`}
                    onApprove={() => handleSkillStatus(req.id, "approved")}
                    onReject={() => handleSkillStatus(req.id, "rejected")}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, iconColor, iconBg, label, value, sub, onClick, badge,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  sub: string;
  onClick?: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="relative bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4 w-full text-left hover:border-slate-300 hover:shadow-sm transition-all group"
    >
      {badge !== undefined && (
        <span className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className={`${iconBg} p-3 rounded-xl shrink-0`}>
        <Icon size={20} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5 group-hover:text-[#003f54] transition-colors">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </div>
    </button>
  );
}

function SkillRequestRow({
  request, loading, onApprove, onReject,
}: {
  request: SkillRequest;
  loading: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const date = request.created_at
    ? new Date(request.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
    : "";

  return (
    <div className="px-6 py-4 hover:bg-slate-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 text-sm">{request.title}</span>
            {request.status === "pending" && <StatusBadge color="amber">Pendiente</StatusBadge>}
            {request.status === "approved" && <StatusBadge color="green">Aprobada</StatusBadge>}
            {request.status === "rejected" && <StatusBadge color="red">Rechazada</StatusBadge>}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {request.user_email} · {request.tenant_id} · {date}
          </p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mt-1.5 transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? "Ocultar detalle" : "Ver detalle"}
          </button>
          {expanded && (
            <div className="mt-3 space-y-3 text-sm bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Por qué la necesita</p>
                <p className="text-slate-700">{request.why}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Cómo mejoraría su trabajo</p>
                <p className="text-slate-700">{request.benefit}</p>
              </div>
            </div>
          )}
        </div>
        {request.status === "pending" && (
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <button
              onClick={onApprove}
              disabled={loading}
              className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              Aprobar
            </button>
            <button
              onClick={onReject}
              disabled={loading}
              className="flex items-center gap-1 bg-white text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              <XCircle size={12} />
              Rechazar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl flex items-center justify-center py-16">
      <Loader2 size={22} className="animate-spin text-slate-300" />
    </div>
  );
}

function EmptyCard({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl flex flex-col items-center gap-3 py-16 text-slate-400">
      <Icon size={32} />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function StatusBadge({ color, children }: { color: "green" | "red" | "amber"; children: React.ReactNode }) {
  const cls = { green: "bg-green-100 text-green-700", red: "bg-red-100 text-red-700", amber: "bg-amber-100 text-amber-700" }[color];
  return <span className={`${cls} text-xs font-semibold px-2.5 py-0.5 rounded-full`}>{children}</span>;
}
