/**
 * API Client — Axios instance with Firebase Auth interceptor.
 *
 * Estado actual: usando MOCKS para desarrollo local.
 *
 * ─── PARA CONECTAR AL BACKEND REAL ──────────────────────────────────────────
 *  1. Asegurarte de que NEXT_PUBLIC_API_URL apunta al backend desplegado.
 *  2. En cada función, comentar la línea "return mock...()" y descomentar
 *     la llamada real de Axios que aparece debajo.
 *  3. El interceptor de Axios (línea ~30) ya adjunta el token Firebase
 *     automáticamente — no hay nada más que configurar en auth.
 * ────────────────────────────────────────────────────────────────────────────
 */

import axios from "axios";
import { auth } from "@/lib/firebase";
import { mockQueryAgent } from "@/lib/mocks/query.mock";
import { mockGetAuditLogs } from "@/lib/mocks/audit.mock";
import { mockGetSecurityMetrics } from "@/lib/mocks/security.mock";
import { mockConnectOnboarding, mockTestConnection } from "@/lib/mocks/onboarding.mock";

// Axios instance apuntando al backend
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: adjunta el token Firebase a cada request
// (ya funcionará en cuanto el usuario esté logueado con Firebase Auth)
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────────────────────────────────────
// queryAgent — POST /query
// ─────────────────────────────────────────────────────────────────────────────
export async function queryAgent(question: string) {
  // 🔴 MOCK ACTIVO — comentar esta línea cuando el backend esté listo
  return mockQueryAgent(question);

  // ✅ REAL — descomentar cuando el backend esté disponible
  // const response = await api.post("/query", { question });
  // return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// getAuditLogs — GET /audit/logs
// ─────────────────────────────────────────────────────────────────────────────
export async function getAuditLogs() {
  // 🔴 MOCK ACTIVO — comentar esta línea cuando el backend esté listo
  return mockGetAuditLogs();

  // ✅ REAL — descomentar cuando el backend esté disponible (Issue #18)
  // const response = await api.get("/audit/logs");
  // return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// getSecurityMetrics — GET /audit/security
// ─────────────────────────────────────────────────────────────────────────────
export async function getSecurityMetrics() {
  // 🔴 MOCK ACTIVO — comentar esta línea cuando el backend esté listo
  return mockGetSecurityMetrics();

  // ✅ REAL — descomentar cuando el backend esté disponible (Issue #19)
  // const response = await api.get("/audit/security");
  // return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// connectOnboarding — POST /onboarding/connect
// ─────────────────────────────────────────────────────────────────────────────
export async function connectOnboarding(payload: {
  company_name: string;
  connection_string: string;
  tenant_id: string;
}) {
  // 🔴 MOCK ACTIVO — comentar esta línea cuando el backend esté listo
  return mockConnectOnboarding(payload);

  // ✅ REAL — descomentar cuando el backend esté disponible (Issue #23)
  // Requiere que el usuario tenga rol "admin" en Firebase Auth custom claims
  // const response = await api.post("/onboarding/connect", payload);
  // return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// testConnection — POST /onboarding/test
// ─────────────────────────────────────────────────────────────────────────────
export async function testConnection(connectionString: string) {
  // 🔴 MOCK ACTIVO — comentar esta línea cuando el backend esté listo
  return mockTestConnection(connectionString);

  // ✅ REAL — descomentar cuando el backend esté disponible
  // const response = await api.post("/onboarding/test", { connection_string: connectionString });
  // return response.data;
}

export default api;
