/**
 * AI Service — now calls the Firebase Cloud Function instead of Groq directly.
 *
 * The Cloud Function handles:
 *   - Audio transcription (whisper-large-v3) with immediate deletion (COPPA)
 *   - Image analysis (llama-4-scout-17b-16e-instruct)
 *   - Agent workflow (llama-3.3-70b-versatile): classify + cross-reference + decide action
 *   - PII stripping before any external call
 *   - Persisting results to Firestore
 *
 * The client never holds an API key or calls Groq directly.
 */

import {
  collection,
  deleteDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import type { AgenticResult, AILogEntry, FirestoreReport } from "../app/types";
import { app } from "../firebaseConfig";

const functions = getFunctions(app);
const processReportFn = httpsCallable(functions, "processReport");

export async function runAgenticWorkflow(
  text: string,
  context?: { imageBase64?: string; audioBase64?: string },
): Promise<AgenticResult> {
  try {
    const payload: Record<string, unknown> = { text };

    if (context?.imageBase64) {
      payload.imageBase64 = context.imageBase64;
    }
    if (context?.audioBase64) {
      payload.audioBase64 = context.audioBase64;
    }

    const result = await processReportFn(payload);
    const data = result.data as AgenticResult;

    return {
      reportId: data.reportId || "",
      friendlyResponse: data.friendlyResponse || "",
      summary: data.summary || "",
      category: data.category || "other",
      location: data.location || "unknown",
      severity: data.severity || "medium",
      decision: data.decision || "PROCEED",
      action: data.action || { type: "recommendation", content: "" },
    };
  } catch (error) {
    console.error("Agent workflow error:", error);
    return {
      reportId: "",
      friendlyResponse: "I'm having trouble thinking. Let's try again! 🤖",
      summary: "",
      category: "other",
      location: "unknown",
      severity: "medium",
      decision: "ERROR",
      action: { type: "recommendation", content: "" },
    };
  }
}

// ── Firestore-backed interaction log ─────────────────────────────────

const firestore = getFirestore();

export async function getAIInteractionLog(
  userId?: string,
): Promise<AILogEntry[]> {
  try {
    const reportsRef = collection(firestore, "reports");
    const q = userId
      ? query(
          reportsRef,
          where("userId", "==", userId),
          orderBy("createdAt", "desc"),
        )
      : query(reportsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data() as FirestoreReport;
      const ts = data.createdAt as unknown as Timestamp;
      return {
        id: data.reportId,
        timestamp: ts ? ts.toDate() : new Date(),
        type: data.hasAudio
          ? ("voice" as const)
          : data.hasImage
            ? ("image" as const)
            : ("text" as const),
        userInput: data.inputText || "",
        aiResponse: data.friendlyResponse || "",
        toolsUsed: ["groq_llm"],
        category: data.category,
        severity: data.severity,
      };
    });
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return [];
  }
}

export async function deleteAllData(userId?: string): Promise<void> {
  try {
    const reportsRef = collection(firestore, "reports");
    const snapshot = userId
      ? await getDocs(query(reportsRef, where("userId", "==", userId)))
      : await getDocs(reportsRef);
    const deletes = snapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletes);
    console.log("[DATA SOVEREIGNTY] All reports deleted from Firestore");
  } catch (error) {
    console.error("Delete failed:", error);
  }
}

// Kept for backward-compat with logAIInteraction call-sites,
// but now a no-op since reporting is server-side.
export function logAIInteraction(
  _type: "text" | "image" | "voice",
  _userInput: string,
  _aiResponse: string,
  _toolsUsed: string[],
  _category?: string,
  _severity?: string,
): void {
  // All interaction logging happens server-side in Firestore.
  // This stub is kept to avoid breaking existing call-sites.
}

export function clearAIInteractionLog(): void {
  // No-op; data lives in Firestore now.
}
