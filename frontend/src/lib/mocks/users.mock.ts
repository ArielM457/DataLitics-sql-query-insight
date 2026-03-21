/**
 * MOCK — gestión de usuarios, códigos de invitación y aprobaciones.
 *
 * Todo se guarda en localStorage para simular una base de datos.
 * En producción esto debería ser Firebase Firestore o un endpoint del backend.
 *
 * ─── CUANDO EL BACKEND / FIRESTORE ESTÉ LISTO ───────────────────────────────
 *  1. Reemplazar las funciones de localStorage por llamadas a Firestore:
 *     - Collection "invite_codes": { code, tenantId, createdBy, expiresAt, used }
 *     - Collection "pending_users": { uid, email, name, tenantId, status, requestedAt }
 *  2. El admin llama a firebase_admin.auth.set_custom_user_claims() desde el
 *     backend para activar el rol del usuario al aprobarlos.
 *  3. El frontend entonces solo lee los claims del token (ver AuthContext.tsx).
 * ────────────────────────────────────────────────────────────────────────────
 */

const CODES_KEY = "dataagent_invite_codes";
const PENDING_KEY = "dataagent_pending_users";

export interface InviteCode {
  code: string;
  tenantId: string;
  companyName: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

export interface PendingUser {
  uid: string;
  email: string;
  name: string;
  tenantId: string;
  companyName: string;
  requestedAt: number;
  status: "pending" | "approved" | "rejected";
}

// ─── Invite Codes ─────────────────────────────────────────────────────────────

function loadCodes(): InviteCode[] {
  try {
    return JSON.parse(localStorage.getItem(CODES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveCodes(codes: InviteCode[]) {
  localStorage.setItem(CODES_KEY, JSON.stringify(codes));
}

function randomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function generateInviteCode(
  tenantId: string,
  companyName: string,
  expiresInMs: number
): InviteCode {
  const code: InviteCode = {
    code: randomCode(),
    tenantId,
    companyName,
    createdAt: Date.now(),
    expiresAt: Date.now() + expiresInMs,
    used: false,
  };
  const codes = loadCodes();
  codes.push(code);
  saveCodes(codes);
  return code;
}

export function validateInviteCode(
  code: string
): { valid: true; data: InviteCode } | { valid: false; reason: string } {
  const codes = loadCodes();
  const entry = codes.find((c) => c.code === code.toUpperCase());
  if (!entry) return { valid: false, reason: "Código no encontrado." };
  if (entry.used) return { valid: false, reason: "El código ya fue utilizado." };
  if (Date.now() > entry.expiresAt) return { valid: false, reason: "El código ha expirado." };
  return { valid: true, data: entry };
}

export function markCodeUsed(code: string) {
  const codes = loadCodes();
  const idx = codes.findIndex((c) => c.code === code.toUpperCase());
  if (idx !== -1) {
    codes[idx].used = true;
    saveCodes(codes);
  }
}

export function getInviteCodes(tenantId: string): InviteCode[] {
  return loadCodes().filter((c) => c.tenantId === tenantId);
}

// ─── Pending Users ────────────────────────────────────────────────────────────

function loadPending(): PendingUser[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function savePending(users: PendingUser[]) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(users));
}

export function addPendingUser(user: Omit<PendingUser, "requestedAt" | "status">) {
  const pending = loadPending();
  // evitar duplicados
  if (pending.find((p) => p.uid === user.uid)) return;
  pending.push({ ...user, requestedAt: Date.now(), status: "pending" });
  savePending(pending);
}

export function getPendingUsers(tenantId: string): PendingUser[] {
  return loadPending().filter((u) => u.tenantId === tenantId);
}

export function updateUserStatus(uid: string, status: "approved" | "rejected") {
  const pending = loadPending();
  const idx = pending.findIndex((u) => u.uid === uid);
  if (idx !== -1) {
    pending[idx].status = status;
    savePending(pending);
  }
}

export function getUserStatus(uid: string): PendingUser | null {
  return loadPending().find((u) => u.uid === uid) ?? null;
}
