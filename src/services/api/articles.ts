// ── 文章 API ──────────────────────────────────────────────
import { requestJson } from "./client";
import type { ArticleDraft, HotArticle, ArticleVersion } from "./types";

export async function saveDraft(payload: ArticleDraft & { auto_fix?: boolean }, signal?: AbortSignal) {
  const res = await requestJson<ArticleDraft & { id: number; auto_fixed?: boolean }>(
    "/api/v1/articles/draft", { method: "POST", data: payload, signal }
  );
  return res.data;
}

export async function fetchLatestDraft() {
  const res = await requestJson<(ArticleDraft & { id: number }) | null>("/api/v1/articles/latest-draft", { method: "GET" });
  return res.data;
}

export async function fetchArticle(id: number) {
  const res = await requestJson<HotArticle & { status: NonNullable<ArticleDraft["status"]>; media_urls?: string[] }>(
    `/api/v1/articles/${id}`, { method: "GET" }
  );
  return res.data;
}

export async function fetchArticleVersions(id: number) {
  const res = await requestJson<ArticleVersion[]>(`/api/v1/articles/${id}/versions`, { method: "GET" });
  return res.data;
}

export async function restoreArticleVersion(articleId: number, versionId: number) {
  const res = await requestJson<HotArticle & { status: NonNullable<ArticleDraft["status"]>; media_urls?: string[] }>(
    `/api/v1/articles/${articleId}/versions/${versionId}/restore`, { method: "POST" }
  );
  return res.data;
}

export async function withdrawArticle(id: number) {
  const res = await requestJson<HotArticle & { status: NonNullable<ArticleDraft["status"]>; media_urls?: string[] }>(
    `/api/v1/articles/${id}/withdraw`, { method: "POST" }
  );
  return res.data;
}

export async function sendArticleFeedback(id: number, type: "like" | "favorite" | "negative") {
  const res = await requestJson<HotArticle & { status: NonNullable<ArticleDraft["status"]>; media_urls?: string[] }>(
    `/api/v1/articles/${id}/feedback`, { method: "POST", data: { type } }
  );
  return res.data;
}

export async function syncOfflineDrafts(payload: (ArticleDraft & { localId?: string })[]) {
  const res = await requestJson<{ synced: number; results: { localId?: string; serverId?: number; action?: string; skipped?: boolean }[] }>(
    "/api/v1/articles/drafts/sync", { method: "POST", data: { drafts: payload } }
  );
  return res.data;
}

export async function searchArticles(q: string) {
  const res = await requestJson<HotArticle[]>("/api/v1/articles/search", { method: "GET", params: { q } });
  return res.data;
}

export async function fetchHotArticles(params?: { cursor?: string; category?: string; time_range?: string }) {
  const res = await requestJson<{ list: HotArticle[]; nextCursor?: string }>(
    "/api/v1/rank/hot", { method: "GET", params: { cursor: params?.cursor, limit: 10, category: params?.category, time_range: params?.time_range } }
  );
  return res.data;
}
