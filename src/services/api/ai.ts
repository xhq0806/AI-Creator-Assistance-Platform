// ── AI API ────────────────────────────────────────────────
import { requestJson } from "./client";
import type { AuditResult, GenerationRecord } from "./types";

export async function generateContent(
  payload: { prompt: string; mode: "full_generation" | "rewrite" | "outline" | "structured"; materials?: string[] },
  signal?: AbortSignal
) {
  const res = await requestJson<{
    title: string;
    content: string;
    suggested_tags: string[];
    history_id?: number;
  }>(
    "/api/v1/ai/generate", { method: "POST", data: payload, signal }
  );
  return res.data;
}

export async function generateImage(
  payload: {
    prompt?: string;
    title?: string;
    content?: string;
    materials?: string[];
    history_id?: number;
  },
  signal?: AbortSignal
) {
  const res = await requestJson<{
    media_urls: string[];
    cover_prompt: string;
    alt_text: string;
    provider?: string;
    history_id?: number;
  }>(
    "/api/v1/ai/generate-image", { method: "POST", data: payload, signal }
  );
  return res.data;
}

export async function refineImage(
  payload: { image_url: string; instruction: string },
  signal?: AbortSignal
) {
  const res = await requestJson<{ media_urls: string[]; cover_prompt: string; alt_text: string; provider?: string }>(
    "/api/v1/ai/refine-image", { method: "POST", data: payload, signal }
  );
  return res.data;
}

export async function generateVideo(
  payload: {
    prompt?: string;
    title?: string;
    content?: string;
    materials?: string[];
    history_id?: number;
  },
  signal?: AbortSignal
) {
  const res = await requestJson<{
    media_urls: string[];
    video_prompt: string;
    alt_text: string;
    provider?: string;
    history_id?: number;
  }>(
    "/api/v1/ai/generate-video", { method: "POST", data: payload, signal }
  );
  return res.data;
}

export async function auditContent(payload: { title: string; content: string; prompt?: string }) {
  const res = await requestJson<AuditResult>("/api/v1/ai/audit", { method: "POST", data: payload });
  return res.data;
}

export async function evaluateQuality(payload: { title: string; content: string }) {
  const res = await requestJson<{ quality_score: number; structure: number; depth: number; fluency: number; reason: string }>(
    "/api/v1/ai/quality", { method: "POST", data: payload }
  );
  return res.data;
}

export async function fetchGenerationHistory() {
  const res = await requestJson<GenerationRecord[]>("/api/v1/ai/generation-history", { method: "GET" });
  return res.data;
}

export async function deleteGenerationHistory(id: string) {
  const res = await requestJson<{ deleted: boolean }>(`/api/v1/ai/generation-history/${id}`, { method: "DELETE" });
  return res.data;
}
