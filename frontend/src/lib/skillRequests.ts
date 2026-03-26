/**
 * Firestore helpers for skill requests.
 *
 * Collection: skill_requests
 *   - id: auto-generated
 *   - title: string
 *   - why: string
 *   - benefit: string
 *   - status: "pending" | "approved" | "rejected"
 *   - user_uid: string
 *   - user_email: string
 *   - tenant_id: string
 *   - created_at: Timestamp
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type SkillRequestStatus = "pending" | "approved" | "rejected";

export interface SkillRequest {
  id: string;
  title: string;
  why: string;
  benefit: string;
  status: SkillRequestStatus;
  user_uid: string;
  user_email: string;
  tenant_id: string;
  created_at: string;
}

export async function submitSkillRequest(data: {
  title: string;
  why: string;
  benefit: string;
  user_uid: string;
  user_email: string;
  tenant_id: string;
}) {
  await addDoc(collection(db, "skill_requests"), {
    ...data,
    status: "pending",
    created_at: serverTimestamp(),
  });
}

export async function getSkillRequests(): Promise<SkillRequest[]> {
  const q = query(collection(db, "skill_requests"), orderBy("created_at", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title ?? "",
      why: data.why ?? "",
      benefit: data.benefit ?? "",
      status: (data.status as SkillRequestStatus) ?? "pending",
      user_uid: data.user_uid ?? "",
      user_email: data.user_email ?? "",
      tenant_id: data.tenant_id ?? "",
      created_at: data.created_at?.toDate?.()?.toISOString() ?? "",
    };
  });
}

export async function updateSkillRequestStatus(id: string, status: SkillRequestStatus) {
  await updateDoc(doc(db, "skill_requests", id), { status });
}
