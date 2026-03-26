"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type UserRole } from "@/context/AuthContext";

interface AuthGuardProps {
  children: React.ReactNode;
  /** Rol mínimo requerido. Si no se especifica, solo requiere estar autenticado. */
  requiredRole?: UserRole;
}

/**
 * AuthGuard — protege rutas por autenticación y rol.
 *
 * Comportamiento:
 *  - Sin sesión → redirige a /
 *  - platform_admin → redirige a /platform-dashboard (no accede a la app normal)
 *  - Sesión pendiente → redirige a /pending
 *  - analyst intentando ruta de admin → redirige a /home
 *  - Autenticado con rol correcto → renderiza children
 */
export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter();
  const { user, role, status, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/");
      return;
    }

    // Platform admin has its own separate app — redirect out of the main app
    if (role === "platform_admin") {
      router.replace("/platform-dashboard");
      return;
    }

    if (status === "pending") {
      router.replace("/pending");
      return;
    }

    if (requiredRole === "admin" && role !== "admin") {
      router.replace("/home");
      return;
    }
  }, [user, role, status, loading, requiredRole, router]);

  if (loading || !user || status === "pending" || role === "platform_admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Verificando sesión...</span>
        </div>
      </div>
    );
  }

  if (requiredRole === "admin" && role !== "admin") return null;

  return <>{children}</>;
}
