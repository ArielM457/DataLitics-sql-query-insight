/**
 * API Client — Axios instance with Firebase Auth interceptor.
 *
 * Todos los endpoints del backend están conectados, incluyendo
 * auditoría y métricas de seguridad.
 */

import axios from "axios";
import { auth } from "@/lib/firebase";

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
export async function queryAgent(question: string, clarificationContext?: string) {
  const response = await api.post("/query", {
    question,
    ...(clarificationContext ? { clarification_context: clarificationContext } : {}),
  });
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// clarifyQuery — POST /query/clarify  (Extended Mode only)
// ─────────────────────────────────────────────────────────────────────────────
export interface ClarifyQuestion {
  id: string;
  text: string;
  type: "yes_no" | "choice";
  options?: string[];
}

export async function clarifyQuery(question: string): Promise<{
  needs_clarification: boolean;
  detected_language: string;
  questions: ClarifyQuestion[];
}> {
  const response = await api.post("/query/clarify", { question });
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// getAuditLogs — GET /audit/logs
// ─────────────────────────────────────────────────────────────────────────────
export async function getAuditLogs(filters?: {
  status?: string;
  risk_level?: string;
  user_email?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.risk_level) params.set("risk_level", filters.risk_level);
  if (filters?.user_email) params.set("user_email", filters.user_email);
  if (filters?.date_from) params.set("date_from", filters.date_from);
  if (filters?.date_to) params.set("date_to", filters.date_to);
  if (filters?.limit) params.set("limit", String(filters.limit));

  const response = await api.get("/audit/logs", { params });
  const { logs } = response.data as { logs: Array<Record<string, unknown>>; total: number };

  // Map backend field names to frontend expected shape
  return logs.map((log) => ({
    date: log.timestamp as string,
    user: (log.user_email as string) || (log.user_role as string) || "",
    question: log.question as string,
    status: log.status as string,
    risk_level: log.risk_level as string,
    block_type: (log.block_type as string) || null,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// getSecurityMetrics — GET /audit/security
// ─────────────────────────────────────────────────────────────────────────────
export async function getSecurityMetrics() {
  const response = await api.get("/audit/security");
  const data = response.data as Record<string, unknown>;

  // Map backend field names to frontend expected shape
  return {
    blocked_threats: (data.threats_blocked as number) || 0,
    out_of_context_queries: (data.out_of_context as number) || 0,
    restricted_access_attempts: (data.restricted_access as number) || 0,
    circuit_breaker_activations: (data.circuit_breaker_activations as number) || 0,
    attack_type_breakdown: (data.attack_type_breakdown as Record<string, number>) || {},
    total_events: (data.total_events as number) || 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getRecentActivity — GET /audit/recent
// ─────────────────────────────────────────────────────────────────────────────
export async function getRecentActivity(limit = 10) {
  const response = await api.get("/audit/recent", { params: { limit } });
  return response.data as {
    events: Array<{
      timestamp: string;
      type: string;
      event_type: string;
      user_email: string;
      question?: string;
      details: Record<string, unknown>;
    }>;
    total: number;
  };
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
// setOnboardingAllowedTables — PATCH /onboarding/allowed-tables
// ─────────────────────────────────────────────────────────────────────────────
export async function setOnboardingAllowedTables(
  tenantId: string,
  allowedTables: string[]
) {
  const response = await api.patch("/onboarding/allowed-tables", {
    tenant_id: tenantId,
    allowed_tables: allowedTables,
  });
  return response.data as {
    status: string;
    tenant_id: string;
    allowed_tables: string[];
    total_allowed: number;
    total_available: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getAdminAllowedTables — GET /admin/allowed-tables
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminAllowedTables() {
  const response = await api.get("/admin/allowed-tables");
  return response.data as {
    tenant_id: string;
    all_tables: string[];
    allowed_tables: string[];
    whitelist_configured: boolean;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// updateAdminAllowedTables — PATCH /admin/allowed-tables
// ─────────────────────────────────────────────────────────────────────────────
export async function updateAdminAllowedTables(allowedTables: string[]) {
  const response = await api.patch("/admin/allowed-tables", {
    allowed_tables: allowedTables,
  });
  return response.data as {
    status: string;
    tenant_id: string;
    allowed_tables: string[];
    total_allowed: number;
    total_available: number;
  };
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

// ─────────────────────────────────────────────────────────────────────────────
// Analytics — AI-powered log analysis and chatbot
// ─────────────────────────────────────────────────────────────────────────────

export async function getAnalyticsSummary(limit = 100) {
  const response = await api.get("/analytics/summary", { params: { limit } });
  return response.data as Record<string, unknown>;
}

export async function analyticsChat(question: string, limit = 100) {
  const response = await api.post("/analytics/chat", { question, limit });
  return response.data as { answer: string; tenant_id: string };
}

export async function skillsChat(question: string, limit = 100) {
  const response = await api.post("/analytics/skills-chat", { question, limit });
  return response.data as { answer: string; tenant_id: string };
}

export interface ConversationMeta {
  id: string;
  type: "analytics_chat" | "skills_chat";
  preview: string;
  created_at: string;
  message_count: number;
}

export interface ConversationFull extends ConversationMeta {
  messages: { role: "user" | "assistant"; content: string }[];
}

export async function saveConversation(
  type: "analytics_chat" | "skills_chat",
  messages: { role: string; content: string }[],
  preview: string,
  convId?: string,
) {
  const response = await api.post("/analytics/conversations", {
    type,
    messages,
    preview,
    conv_id: convId ?? null,
  });
  return response.data as ConversationMeta;
}

export async function getRecentConversations() {
  const response = await api.get("/analytics/conversations");
  return (response.data as { conversations: ConversationMeta[] }).conversations;
}

export async function getConversation(convId: string) {
  const response = await api.get(`/analytics/conversations/${convId}`);
  return response.data as ConversationFull;
}

export async function listSkills(agent?: string) {
  const params = agent ? { agent } : {};
  const response = await api.get("/skills", { params });
  return response.data as {
    skills: Array<{
      id: string;
      title: string;
      description: string;
      agent: string;
      category: string;
      tags: string[];
      active: boolean;
    }>;
    total: number;
    agents: string[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform Admin — Cross-tenant data (platform_admin role only)
// ─────────────────────────────────────────────────────────────────────────────

export async function getPlatformUsers() {
  const response = await api.get("/platform/users");
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

export async function getPlatformCompanies() {
  const response = await api.get("/platform/companies");
  return response.data as Array<{
    tenant_id: string;
    company_name: string;
    user_count: number;
  }>;
}

export default api;
