"use client";

/**
 * AuthContext — estado de autenticación compartido en toda la app.
 *
 * Gestiona: usuario Firebase, rol, tenant_id y estado de aprobación.
 *
 * ─── ESTRATEGIA DE CARGA DE PERFIL ───────────────────────────────────────────
 *  1. Intenta leer los custom claims del token Firebase (producción).
 *     El backend los establece al registrar/aprobar usuarios.
 *  2. Si no hay claims (dev local sin Firebase configurado), hace fallback
 *     a localStorage para poder desarrollar localmente.
 *
 * ─── PARA FORZAR ACTUALIZACIÓN DE CLAIMS ─────────────────────────────────────
 *  Llamar refreshProfile() después de cualquier operación del backend que
 *  modifique los claims (registerAdmin, registerAnalyst, approveUser, connect).
 *  Internamente usa getIdTokenResult(true) para forzar refresh del token.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export type UserRole = "admin" | "analyst" | "platform_admin" | null;
export type UserStatus = "active" | "pending" | "rejected" | null;

interface AuthState {
  user: User | null;
  role: UserRole;
  tenantId: string | null;
  status: UserStatus;
  loading: boolean;
  /** Force-refresh Firebase token and re-read claims. Call after backend operations that set claims. */
  refreshProfile: () => Promise<void>;
  /** Dev/fallback: write profile to localStorage. Kept for local development. */
  setMockProfile: (uid: string, role: UserRole, tenantId: string, status: UserStatus) => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  tenantId: null,
  status: null,
  loading: true,
  refreshProfile: async () => {},
  setMockProfile: () => {},
});

// ─── localStorage helpers (dev / fallback) ────────────────────────────────────
const STORAGE_KEY = "dataagent_profile";

interface LocalProfile {
  role: UserRole;
  tenantId: string | null;
  status: UserStatus;
}

function readLocalProfile(uid: string): LocalProfile {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${uid}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { role: "analyst", tenantId: null, status: "pending" };
}

function writeLocalProfile(uid: string, profile: LocalProfile) {
  localStorage.setItem(`${STORAGE_KEY}_${uid}`, JSON.stringify(profile));
}

// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [status, setStatus] = useState<UserStatus>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Load user profile from Firebase custom claims (production) or
   * localStorage (dev fallback).
   *
   * @param u - Firebase user object
   * @param forceRefresh - if true, forces a token refresh to get latest claims
   */
  const loadProfile = useCallback(async (u: User, forceRefresh = false) => {
    try {
      const tokenResult = await u.getIdTokenResult(forceRefresh);
      const claimsRole = tokenResult.claims.role as UserRole | undefined;
      const claimsTenantId = tokenResult.claims.tenant_id as string | undefined;
      const claimsStatus = tokenResult.claims.status as UserStatus | undefined;

      if (claimsRole === "platform_admin") {
        // Platform admin: no tenant, always active
        setRole("platform_admin");
        setTenantId(null);
        setStatus("active");
      } else if (claimsRole) {
        // Production: use Firebase custom claims
        setRole(claimsRole);
        setTenantId(claimsTenantId ?? null);
        // If status claim not set explicitly, active users are... active
        setStatus(claimsStatus ?? "active");
      } else {
        // Dev / fallback: read from localStorage
        const profile = readLocalProfile(u.uid);
        setRole(profile.role);
        setTenantId(profile.tenantId);
        setStatus(profile.status);
      }
    } catch {
      // If token refresh fails, fallback to localStorage
      const profile = readLocalProfile(u.uid);
      setRole(profile.role);
      setTenantId(profile.tenantId);
      setStatus(profile.status);
    }
  }, []);

  /**
   * Force-refresh the Firebase token and re-read claims.
   * Call this after any backend operation that sets custom claims.
   */
  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user, true);
    }
  }, [user, loadProfile]);

  /**
   * Write a profile to localStorage (dev / fallback).
   * Also updates React state if the uid matches the current user.
   */
  const setMockProfile = useCallback(
    (uid: string, r: UserRole, t: string, s: UserStatus) => {
      writeLocalProfile(uid, { role: r, tenantId: t, status: s });
      if (uid === user?.uid) {
        setRole(r);
        setTenantId(t);
        setStatus(s);
      }
    },
    [user]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadProfile(u, false);
      } else {
        setRole(null);
        setTenantId(null);
        setStatus(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [loadProfile]);

  return (
    <AuthContext.Provider
      value={{ user, role, tenantId, status, loading, refreshProfile, setMockProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
