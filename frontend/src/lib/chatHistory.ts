/**
 * chatHistory.ts — Firestore helpers para historial de chats y logs de consultas.
 *
 * Colecciones:
 *  - chat_sessions/{sessionId}                — metadata de cada conversación
 *  - chat_sessions/{sessionId}/messages/{id}  — mensajes individuales
 *  - query_logs/{logId}                       — log de cada petición al pipeline
 *
 * Todas las operaciones son silenciosas: si Firestore no está disponible
 * (dev sin config, SSR, red) simplemente retornan null/[]/void sin romper el chat.
 */

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  Timestamp,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export interface AgentResponse {
  sql?: string;
  explanation?: string;
  data?: Record<string, unknown>[];
  insights?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: AgentResponse;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  uid: string;
  tenant_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  message_count: number;
}

// ─── Guard ────────────────────────────────────────────────────────────────────

function isAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    !!db &&
    // Si db es el objeto vacío de fallback SSR, no tiene la prop _settings
    Object.keys(db).length > 0
  );
}

// ─── Chat sessions ─────────────────────────────────────────────────────────────

/** Crea una nueva sesión de chat. Retorna el sessionId o null si Firestore no está disponible. */
export async function createChatSession(
  uid: string,
  tenantId: string,
  firstMessage: string
): Promise<string | null> {
  if (!isAvailable()) return null;
  try {
    const title =
      firstMessage.length > 60
        ? firstMessage.substring(0, 60) + "…"
        : firstMessage;
    const docRef = await addDoc(collection(db, "chat_sessions"), {
      uid,
      tenant_id: tenantId,
      title,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      message_count: 0,
    });
    return docRef.id;
  } catch {
    return null;
  }
}

/** Añade un mensaje a una sesión existente y actualiza su metadata. */
export async function addMessageToSession(
  sessionId: string,
  message: {
    role: "user" | "assistant";
    content: string;
    response?: AgentResponse;
  }
): Promise<void> {
  if (!isAvailable()) return;
  try {
    await addDoc(collection(db, "chat_sessions", sessionId, "messages"), {
      role: message.role,
      content: message.content,
      ...(message.response ? { response: message.response } : {}),
      timestamp: serverTimestamp(),
    });
    await updateDoc(doc(db, "chat_sessions", sessionId), {
      updated_at: serverTimestamp(),
      message_count: increment(1),
    });
  } catch {
    // Silencioso — el chat sigue funcionando sin persistencia
  }
}

/** Carga todas las sesiones de un usuario, ordenadas por más reciente. */
export async function loadUserSessions(uid: string): Promise<ChatSession[]> {
  if (!isAvailable()) return [];
  try {
    const q = query(
      collection(db, "chat_sessions"),
      where("uid", "==", uid),
      orderBy("updated_at", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        uid: d.uid,
        tenant_id: d.tenant_id,
        title: d.title,
        created_at: (d.created_at as Timestamp)?.toDate() ?? new Date(),
        updated_at: (d.updated_at as Timestamp)?.toDate() ?? new Date(),
        message_count: d.message_count ?? 0,
      };
    });
  } catch {
    return [];
  }
}

/** Carga todos los mensajes de una sesión en orden cronológico. */
export async function loadSessionMessages(
  sessionId: string
): Promise<ChatMessage[]> {
  if (!isAvailable()) return [];
  try {
    const q = query(
      collection(db, "chat_sessions", sessionId, "messages"),
      orderBy("timestamp", "asc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        role: d.role as "user" | "assistant",
        content: d.content,
        response: d.response,
        timestamp: (d.timestamp as Timestamp)?.toDate() ?? new Date(),
      };
    });
  } catch {
    return [];
  }
}

// ─── Query logs ───────────────────────────────────────────────────────────────

/** Registra una petición al pipeline de agentes. */
export async function logQueryRequest(params: {
  uid: string;
  tenant_id: string;
  session_id: string;
  question: string;
  sql?: string;
  success: boolean;
  error?: string;
}): Promise<void> {
  if (!isAvailable()) return;
  try {
    await addDoc(collection(db, "query_logs"), {
      ...params,
      timestamp: serverTimestamp(),
    });
  } catch {
    // Silencioso
  }
}
