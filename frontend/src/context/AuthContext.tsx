"use client";

/**
 * AuthContext — estado de autenticación compartido en toda la app.
 *
 * Gestiona: usuario Firebase, rol, tenant_id y estado de aprobación.
 *
 * ─── ROLES ───────────────────────────────────────────────────────────────────
 *  "admin"   → Ve: Chat, Dashboard, Audit, Onboarding, Admin (users)
 *  "analyst" → Ve: Chat únicamente
 *  null      → No autenticado → redirige a /
 *
 * ─── CUANDO EL BACKEND ESTÉ LISTO ───────────────────────────────────────────
 *  Actualmente el rol y tenant_id se guardan en localStorage (mock).
 *  Cuando el backend implemente Firebase custom claims (Issue #04), reemplazar
 *  la lectura de localStorage por:
 *    const tokenResult = await user.getIdTokenResult();
 *    const role = tokenResult.claims.role ?? "analyst";
 *    const tenantId = tokenResult.claims.tenant_id ?? null;
 *  El interceptor de Axios en api.ts ya envía el token — solo cambiar lectura aquí.
 * ────────────────────────────────────────────────────────────────────────────
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export type UserRole = "admin" | "analyst" | null;
export type UserStatus = "active" | "pending" | "rejected" | null;

interface AuthState {
  user: User | null;
  role: UserRole;
  tenantId: string | null;
  status: UserStatus;
  loading: boolean;
  // Actualiza el perfil en localStorage (mock) — eliminar cuando custom claims estén activos
  setMockProfile: (uid: string, role: UserRole, tenantId: string, status: UserStatus) => void;
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  tenantId: null,
  status: null,
  loading: true,
  setMockProfile: () => {},
  refreshProfile: () => {},
});

// ─── helpers de localStorage (mock) ──────────────────────────────────────────
const STORAGE_KEY = "dataagent_profile";

interface MockProfile {
  role: UserRole;
  tenantId: string | null;
  status: UserStatus;
}

function readProfile(uid: string): MockProfile {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${uid}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { role: "analyst", tenantId: null, status: "pending" };
}

function writeProfile(uid: string, profile: MockProfile) {
  localStorage.setItem(`${STORAGE_KEY}_${uid}`, JSON.stringify(profile));
}

// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [status, setStatus] = useState<UserStatus>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = (u: User) => {
    // 🔴 MOCK — leer de localStorage
    const profile = readProfile(u.uid);
    setRole(profile.role);
    setTenantId(profile.tenantId);
    setStatus(profile.status);

    // ✅ REAL — descomentar cuando custom claims estén configurados (Issue #04):
    // u.getIdTokenResult(true).then((result) => {
    //   setRole((result.claims.role as UserRole) ?? "analyst");
    //   setTenantId((result.claims.tenant_id as string) ?? null);
    //   setStatus("active"); // backend controla acceso via claims
    // });
  };

  const setMockProfile = (
    uid: string,
    r: UserRole,
    t: string,
    s: UserStatus
  ) => {
    // Siempre escribe en localStorage para el uid indicado
    writeProfile(uid, { role: r, tenantId: t, status: s });
    // Solo actualiza el estado React si es el usuario actual
    // (evita que el admin sobreescriba su propio rol al aprobar a otro usuario)
    if (uid === user?.uid) {
      setRole(r);
      setTenantId(t);
      setStatus(s);
    }
  };

  const refreshProfile = () => {
    if (user) loadProfile(user);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        loadProfile(u);
      } else {
        setRole(null);
        setTenantId(null);
        setStatus(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider
      value={{ user, role, tenantId, status, loading, setMockProfile, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
