/**
 * API Client — Axios instance with Firebase Auth interceptor.
 *
 * Provides a pre-configured Axios instance that automatically
 * attaches the Firebase ID token to all requests heading to the
 * DataAgent backend API.
 */

import axios from "axios";
import { auth } from "@/lib/firebase";

// Create Axios instance with backend base URL
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach Firebase ID token
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Send a natural language question to the DataAgent backend.
 * @param question - The user's question in natural language.
 * @returns The query response with SQL, data, and insights.
 */
export async function queryAgent(question: string) {
  const response = await api.post("/query", { question });
  return response.data;
}

/**
 * Retrieve audit logs from the backend.
 * @returns List of audit log entries.
 */
export async function getAuditLogs() {
  const response = await api.get("/audit/logs");
  return response.data;
}

/**
 * Retrieve security metrics from the backend.
 * @returns Security metrics summary.
 */
export async function getSecurityMetrics() {
  const response = await api.get("/audit/security");
  return response.data;
}

export default api;
