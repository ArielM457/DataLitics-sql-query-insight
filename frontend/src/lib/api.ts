/**
 * API Client — Axios instance with Firebase Auth interceptor.
 *
 * Todos los endpoints reales del backend están conectados.
 * Las métricas de seguridad (getAuditLogs, getSecurityMetrics) siguen en mock
 * mientras otros miembros del equipo terminan esa parte del backend.
 */

import axios from "axios";
import { auth } from "@/lib/firebase";
import { mockGetAuditLogs } from "@/lib/mocks/audit.mock";
import { mockGetSecurityMetrics } from "@/lib/mocks/security.mock";

// Axios instance apuntando al backend
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: adjunta el token Firebase a cada request
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
  const response = await api.post("/query", { question });
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// getAuditLogs — GET /audit/logs
// 🔴 MOCK: pendiente de activar cuando el equipo termine el backend de auditoría
// ─────────────────────────────────────────────────────────────────────────────
export async function getAuditLogs() {
  return mockGetAuditLogs();
  // const response = await api.get("/audit/logs");
  // return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// getSecurityMetrics — GET /audit/security
// 🔴 MOCK: pendiente de activar cuando el equipo termine el backend de seguridad
// ─────────────────────────────────────────────────────────────────────────────
export async function getSecurityMetrics() {
  return mockGetSecurityMetrics();
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
  const response = await api.post("/onboarding/connect", payload);
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// testConnection — POST /onboarding/test
// ─────────────────────────────────────────────────────────────────────────────
export async function testConnection(connectionString: string) {
  const response = await api.post("/onboarding/test", {
    connection_string: connectionString,
  });
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Users — Registration and status
// ─────────────────────────────────────────────────────────────────────────────

export async function registerAdmin() {
  const response = await api.post("/users/register/admin");
  return response.data;
}

export async function registerAnalyst(payload: {
  invite_code: string;
  name: string;
  email: string;
}) {
  const response = await api.post("/users/register/analyst", payload);
  return response.data;
}

export async function getUserStatus() {
  const response = await api.get("/users/status");
  return response.data as { uid: string; status: string; tenant_id?: string; company_name?: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin management — Invite codes and user approval
// ─────────────────────────────────────────────────────────────────────────────

export async function createInviteCode(expiresInMs: number) {
  const response = await api.post("/admin/invite-codes", {
    expires_in_ms: expiresInMs,
  });
  return response.data as {
    code: string;
    tenant_id: string;
    company_name: string;
    created_by: string;
    created_at: number;
    expires_at: number;
    used: boolean;
  };
}

export async function getInviteCodesAPI() {
  const response = await api.get("/admin/invite-codes");
  return response.data as Array<{
    code: string;
    tenant_id: string;
    company_name: string;
    created_by: string;
    created_at: number;
    expires_at: number;
    used: boolean;
  }>;
}

export async function getPendingUsersAPI() {
  const response = await api.get("/admin/pending-users");
  return response.data as Array<{
    uid: string;
    email: string;
    name: string;
    tenant_id: string;
    company_name: string;
    requested_at: number;
    status: string;
  }>;
}

export async function approveUserAPI(uid: string) {
  const response = await api.post(`/admin/approve/${uid}`);
  return response.data;
}

export async function rejectUserAPI(uid: string) {
  const response = await api.post(`/admin/reject/${uid}`);
  return response.data;
}

export default api;
