import type { CurrentUser } from "@/app";

export type ApiResponse<T> = {
  code: number;
  data: T;
  message?: string;
};

export type ArticleDraft = {
  id?: number;
  title: string;
  content: string;
  media_urls?: string[];
  category?: string;
  status?: "draft" | "pending_review" | "published" | "rejected" | "withdrawn";
  quality_score?: number;
};

export type AuditResult = {
  is_compliant: boolean;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  reason: string;
  accuracy: number;
  safe_alternative?: string;
};

export type HotArticle = Required<
  Pick<ArticleDraft, "id" | "title" | "content">
> & {
  user_id: number;
  cover_url?: string;
  author?: { id: number; username: string };
  category?: string;
  created_at?: string;
  updated_at?: string;
  view_count: number;
  quality_score: number;
  ai_rank_score?: number;
  ai_rank_reason?: string;
  ai_rank_tags?: string[];
  like_count: number;
  favorite_count: number;
  negative_count: number;
  score: number;
};

export type PromptTemplate = {
  id: number;
  user_id?: number | null;
  team_id?: number | null;
  name: string;
  category: string;
  content: string;
  visibility?: "private" | "team_public" | "system_public";
  usage_count: number;
};

export type MaterialItem = {
  id: number;
  user_id: number;
  name: string;
  url: string;
  file_key?: string;
  file_size?: number;
  mime_type?: string;
  media_type: "image" | "video" | "audio";
  risk_status: "approved" | "rejected";
  risk_reason: string;
};

export type ArticleVersion = Required<
  Pick<ArticleDraft, "id" | "title" | "content">
> & {
  article_id: number;
  user_id: number;
  version_no: number;
  media_urls?: string[];
  status: NonNullable<ArticleDraft["status"]>;
  quality_score: number;
  source: "draft_save" | "publish" | "offline_sync" | "restore" | "withdraw";
  created_at?: string;
};

export type OfflineDraftSyncResult = {
  synced: number;
  results: {
    localId?: string;
    serverId?: number;
    action?: "created" | "updated";
    skipped?: boolean;
    reason?: string;
  }[];
};

export type PromptTeam = {
  id: number;
  name: string;
  owner_id: number;
  created_at?: string;
};

export type PromptTemplateVersion = {
  id: number;
  template_id: number;
  version_no: number;
  name: string;
  category: string;
  content: string;
  change_note?: string;
  created_by: number;
  created_at?: string;
};

export type AuditManualAnnotationItem = {
  id: number;
  article_id?: number | null;
  title: string;
  content: string;
  ai_prediction_risk: "SAFE" | "RISK_LOW" | "RISK_MEDIUM" | "RISK_HIGH";
  ground_truth_risk: "SAFE" | "RISK_LOW" | "RISK_MEDIUM" | "RISK_HIGH";
  risk_category: "NONE" | "PORN" | "GAMBLING" | "DRUG" | "POLITICAL" | "OTHER";
  annotation_note?: string;
  annotated_at?: string;
};

export type UploadCredential = {
  provider: string;
  upload_url: string;
  access_url: string;
  file_key: string;
  material_id?: number;
  expired_at: number;
  policy?: string;
  signature?: string;
  access_id?: string;
  oss_key?: string;
};

export type AuditEvaluationReportItem = {
  id: number;
  total_samples: number;
  accuracy_rate: number;
  precision_rate: number;
  recall_rate: number;
  f1_score: number;
  per_category_metrics?: Record<
    string,
    {
      accuracy: number;
      precision: number;
      recall: number;
      f1: number;
      total: number;
    }
  >;
  per_risk_level_metrics?: Record<
    string,
    {
      accuracy: number;
      precision: number;
      recall: number;
      f1: number;
      total: number;
    }
  >;
  confusion_matrix?: Record<string, Record<string, number>>;
  report_generated_at?: string;
};

async function requestJson<T>(
  url: string,
  options: RequestInit & {
    data?: unknown;
    params?: Record<string, unknown>;
    skipRefresh?: boolean;
  } = {}
) {
  const rawUser = window.localStorage.getItem("ai_creator_user");
  let user: CurrentUser | null = null;
  try {
    user = rawUser ? (JSON.parse(rawUser) as CurrentUser) : null;
  } catch {
    user = null;
  }
  const token = user?.token || "";
  const searchParams = new URLSearchParams();

  Object.entries(options.params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const response = await fetch(
    `${url}${searchParams.size ? `?${searchParams.toString()}` : ""}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: options.data ? JSON.stringify(options.data) : options.body,
    }
  );
  let payload: ApiResponse<T>;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch (e) {
    throw new Error("响应解析失败");
  }

  if (response.status === 401 && user?.refreshToken && !options.skipRefresh) {
    try {
      const refreshResponse = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: user.refreshToken }),
      });
      const refreshPayload = await refreshResponse.json();
      if (refreshResponse.ok && refreshPayload.code === 200) {
        const refreshed = refreshPayload.data as CurrentUser;
        window.localStorage.setItem(
          "ai_creator_user",
          JSON.stringify(refreshed)
        );
        const retryResponse = await fetch(
          `${url}${searchParams.size ? `?${searchParams.toString()}` : ""}`,
          {
            ...options,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${refreshed.token}`,
              ...options.headers,
            },
            body: options.data ? JSON.stringify(options.data) : options.body,
          }
        );
        const retryPayload = (await retryResponse.json()) as ApiResponse<T>;
        if (!retryResponse.ok || retryPayload.code !== 200) {
          throw new Error(retryPayload.message || "请求失败");
        }
        return retryPayload;
      }
    } catch {
      // refresh failed, fall through to error
    }
    window.localStorage.removeItem("ai_creator_user");
    window.location.href = "/login";
    throw new Error("登录已过期，请重新登录");
  }

  if (!response.ok || payload.code !== 200) {
    throw new Error(payload.message || "请求失败");
  }

  return payload;
}

export async function refreshAuthToken() {
  const rawUser = window.localStorage.getItem("ai_creator_user");
  const user = rawUser ? (JSON.parse(rawUser) as CurrentUser) : null;
  if (!user?.refreshToken) {
    throw new Error("无 refresh token");
  }
  const response = await requestJson<CurrentUser>("/api/v1/auth/refresh", {
    method: "POST",
    data: { refreshToken: user.refreshToken },
    skipRefresh: true,
  });
  window.localStorage.setItem("ai_creator_user", JSON.stringify(response.data));
  return response.data;
}

export async function login(payload: { account: string; password: string }) {
  const response = await requestJson<CurrentUser>("/api/v1/auth/login", {
    method: "POST",
    data: payload,
  });

  return response.data;
}

export async function register(payload: {
  username: string;
  password: string;
  phone?: string;
  email?: string;
}) {
  const response = await requestJson<CurrentUser>("/api/v1/auth/register", {
    method: "POST",
    data: payload,
  });

  return response.data;
}

export type GenerationRecord = {
  id: string;
  prompt: string;
  mode: string;
  result: {
    title: string;
    content: string;
    suggested_tags?: string[];
    media_urls?: string[];
  };
  created_at: string;
};

export async function generateContent(
  payload: {
    prompt: string;
    mode: "full_generation" | "rewrite" | "outline" | "structured";
    materials?: string[];
  },
  signal?: AbortSignal
) {
  const response = await requestJson<{
    title: string;
    content: string;
    suggested_tags: string[];
  }>("/api/v1/ai/generate", {
    method: "POST",
    data: payload,
    signal,
  });

  return response.data;
}

export async function generateImage(
  payload: {
    prompt?: string;
    title?: string;
    content?: string;
    materials?: string[];
  },
  signal?: AbortSignal
) {
  const response = await requestJson<{
    media_urls: string[];
    cover_prompt: string;
    alt_text: string;
    provider?: string;
    placeholder_reason?: string;
  }>("/api/v1/ai/generate-image", {
    method: "POST",
    data: payload,
    signal,
  });

  return response.data;
}

export async function generateVideo(
  payload: {
    prompt?: string;
    title?: string;
    content?: string;
    materials?: string[];
  },
  signal?: AbortSignal
) {
  const response = await requestJson<{
    media_urls: string[];
    video_prompt: string;
    alt_text: string;
    provider?: string;
  }>("/api/v1/ai/generate-video", {
    method: "POST",
    data: payload,
    signal,
  });

  return response.data;
}

export async function auditContent(
  payload: Pick<ArticleDraft, "title" | "content"> & { prompt?: string }
) {
  const response = await requestJson<AuditResult>("/api/v1/ai/audit", {
    method: "POST",
    data: payload,
  });

  return response.data;
}

export async function evaluateQuality(
  payload: Pick<ArticleDraft, "title" | "content">
) {
  const response = await requestJson<{
    quality_score: number;
    structure: number;
    depth: number;
    fluency: number;
    reason: string;
  }>("/api/v1/ai/quality", {
    method: "POST",
    data: payload,
  });

  return response.data;
}

export async function fetchGenerationHistory() {
  const response = await requestJson<GenerationRecord[]>(
    "/api/v1/ai/generation-history",
    { method: "GET" }
  );
  return response.data;
}

export async function deleteGenerationHistory(id: string) {
  const response = await requestJson<{ deleted: boolean }>(
    `/api/v1/ai/generation-history/${id}`,
    { method: "DELETE" }
  );
  return response.data;
}

export async function fetchPromptTemplates() {
  const response = await requestJson<PromptTemplate[]>("/api/v1/prompts", {
    method: "GET",
  });

  return response.data;
}

export async function createPromptTemplate(
  payload: Pick<PromptTemplate, "name" | "category" | "content">
) {
  const response = await requestJson<PromptTemplate>("/api/v1/prompts", {
    method: "POST",
    data: payload,
  });

  return response.data;
}

export async function updatePromptTemplate(
  id: number,
  payload: { name?: string; category?: string; content?: string }
) {
  const response = await requestJson<PromptTemplate>(`/api/v1/prompts/${id}`, {
    method: "PUT",
    data: payload,
  });
  return response.data;
}

export async function deletePromptTemplate(id: number) {
  const response = await requestJson<{ deleted: boolean }>(
    `/api/v1/prompts/${id}`,
    {
      method: "DELETE",
    }
  );

  return response.data;
}

export async function markPromptTemplateUsed(id: number) {
  const response = await requestJson<PromptTemplate>(
    `/api/v1/prompts/${id}/use`,
    {
      method: "POST",
    }
  );

  return response.data;
}

export async function fetchMaterials() {
  const response = await requestJson<MaterialItem[]>("/api/v1/materials", {
    method: "GET",
  });

  return response.data;
}

export async function createMaterial(payload: { name: string; url: string }) {
  const response = await requestJson<MaterialItem>("/api/v1/materials", {
    method: "POST",
    data: payload,
  });

  return response.data;
}

export async function deleteMaterial(id: number) {
  const response = await requestJson<{ deleted: boolean }>(
    `/api/v1/materials/${id}`,
    {
      method: "DELETE",
    }
  );

  return response.data;
}

export async function saveDraft(
  payload: ArticleDraft & { auto_fix?: boolean },
  signal?: AbortSignal
) {
  const response = await requestJson<
    ArticleDraft & { id: number; auto_fixed?: boolean }
  >("/api/v1/articles/draft", {
    method: "POST",
    data: payload,
    signal,
  });

  return response.data;
}

export async function fetchLatestDraft() {
  const response = await requestJson<(ArticleDraft & { id: number }) | null>(
    "/api/v1/articles/latest-draft",
    {
      method: "GET",
    }
  );

  return response.data;
}

export async function fetchArticle(id: number) {
  const response = await requestJson<
    HotArticle & {
      status: NonNullable<ArticleDraft["status"]>;
      media_urls?: string[];
    }
  >(`/api/v1/articles/${id}`, {
    method: "GET",
  });

  return response.data;
}

export async function fetchArticleVersions(id: number) {
  const response = await requestJson<ArticleVersion[]>(
    `/api/v1/articles/${id}/versions`,
    {
      method: "GET",
    }
  );

  return response.data;
}

export async function restoreArticleVersion(
  articleId: number,
  versionId: number
) {
  const response = await requestJson<
    HotArticle & {
      status: NonNullable<ArticleDraft["status"]>;
      media_urls?: string[];
    }
  >(`/api/v1/articles/${articleId}/versions/${versionId}/restore`, {
    method: "POST",
  });

  return response.data;
}

export async function withdrawArticle(id: number) {
  const response = await requestJson<
    HotArticle & {
      status: NonNullable<ArticleDraft["status"]>;
      media_urls?: string[];
    }
  >(`/api/v1/articles/${id}/withdraw`, {
    method: "POST",
  });

  return response.data;
}

export async function sendArticleFeedback(
  id: number,
  type: "like" | "favorite" | "negative"
) {
  const response = await requestJson<
    HotArticle & {
      status: NonNullable<ArticleDraft["status"]>;
      media_urls?: string[];
    }
  >(`/api/v1/articles/${id}/feedback`, {
    method: "POST",
    data: { type },
  });

  return response.data;
}

export async function fetchMyProfile() {
  const response = await requestJson<Omit<CurrentUser, "token">>(
    "/api/v1/users/me",
    {
      method: "GET",
    }
  );

  return response.data;
}

export async function updateMyProfile(payload: {
  username?: string;
  phone?: string;
  email?: string;
}) {
  const response = await requestJson<Omit<CurrentUser, "token">>(
    "/api/v1/users/me",
    {
      method: "PUT",
      data: payload,
    }
  );

  return response.data;
}

export async function changeMyPassword(payload: {
  oldPassword: string;
  newPassword: string;
}) {
  const response = await requestJson<{ message: string }>(
    "/api/v1/users/me/password",
    {
      method: "POST",
      data: payload,
    }
  );

  return response.data;
}

export async function fetchMyArticles() {
  const response = await requestJson<HotArticle[]>(
    "/api/v1/users/me/articles",
    {
      method: "GET",
    }
  );

  return response.data;
}

export async function fetchMyFeedbackArticles(type: "like" | "favorite") {
  const response = await requestJson<HotArticle[]>(
    `/api/v1/users/me/feedback/${type}`,
    {
      method: "GET",
    }
  );

  return response.data;
}

export async function syncOfflineDrafts(
  payload: (ArticleDraft & { localId?: string })[]
) {
  const response = await requestJson<OfflineDraftSyncResult>(
    "/api/v1/articles/drafts/sync",
    {
      method: "POST",
      data: { drafts: payload },
    }
  );

  return response.data;
}

export async function fetchHotArticles(params?: {
  cursor?: string;
  category?: string;
  time_range?: string;
}) {
  const response = await requestJson<{
    list: HotArticle[];
    nextCursor?: string;
  }>("/api/v1/rank/hot", {
    method: "GET",
    params: {
      cursor: params?.cursor,
      limit: 10,
      category: params?.category,
      time_range: params?.time_range,
    },
  });

  return response.data;
}

export async function searchArticles(q: string) {
  const response = await requestJson<HotArticle[]>("/api/v1/articles/search", {
    method: "GET",
    params: { q },
  });
  return response.data;
}

export async function fetchAuditAnnotations(params?: {
  risk_category?: string;
  page?: number;
  pageSize?: number;
}) {
  const response = await requestJson<{
    total: number;
    list: AuditManualAnnotationItem[];
  }>("/api/v1/audit/annotations", {
    method: "GET",
    params: params as Record<string, unknown>,
  });
  return response.data;
}

export async function deleteAuditAnnotation(id: number) {
  const response = await requestJson<{ deleted: boolean }>(
    `/api/v1/audit/annotations/${id}`,
    { method: "DELETE" }
  );
  return response.data;
}

export async function seedAuditSamples(clearExisting?: boolean) {
  const response = await requestJson<{ created: number }>(
    "/api/v1/audit/seed-samples",
    {
      method: "POST",
      data: { clear_existing: !!clearExisting },
    }
  );
  return response.data;
}

export async function generateAuditReport() {
  const response = await requestJson<AuditEvaluationReportItem>(
    "/api/v1/audit/evaluation/report",
    { method: "POST" }
  );
  return response.data;
}

export async function fetchAuditReports() {
  const response = await requestJson<AuditEvaluationReportItem[]>(
    "/api/v1/audit/evaluation/reports",
    { method: "GET" }
  );
  return response.data;
}

export async function fetchAuditReportDetail(id: number) {
  const response = await requestJson<AuditEvaluationReportItem>(
    `/api/v1/audit/evaluation/reports/${id}`,
    { method: "GET" }
  );
  return response.data;
}

export async function syncDistribution(payload: {
  article_id: number;
  platforms: string[];
}) {
  const response = await requestJson<{
    toutiao_item_id?: string;
    douyin_item_id?: string;
    sync_status: string;
  }>("/api/v1/distribution/sync", {
    method: "POST",
    data: payload,
  });

  return response.data;
}

export async function getUploadCredential(payload: {
  file_name: string;
  file_type?: string;
}) {
  const response = await requestJson<UploadCredential>(
    "/api/v1/upload/credential",
    {
      method: "POST",
      data: payload,
    }
  );
  return response.data;
}

export async function confirmUpload(payload: {
  material_id: number;
  file_size?: number;
  mime_type?: string;
}) {
  const response = await requestJson<MaterialItem>("/api/v1/upload/confirm", {
    method: "POST",
    data: payload,
  });
  return response.data;
}

export async function createPromptTeam(payload: { name: string }) {
  const response = await requestJson<PromptTeam>("/api/v1/prompt-teams", {
    method: "POST",
    data: payload,
  });
  return response.data;
}

export async function listMyPromptTeams() {
  const response = await requestJson<PromptTeam[]>("/api/v1/prompt-teams", {
    method: "GET",
  });
  return response.data;
}

export async function saveTemplateWithVersion(payload: {
  id?: number;
  name: string;
  category: string;
  content: string;
  change_note?: string;
  visibility?: "private" | "team_public" | "system_public";
  team_id?: number | null;
}) {
  const response = await requestJson<PromptTemplate>(
    "/api/v1/prompts/with-version",
    {
      method: "POST",
      data: payload,
    }
  );
  return response.data;
}

export async function fetchTemplateVersions(templateId: number) {
  const response = await requestJson<PromptTemplateVersion[]>(
    `/api/v1/prompts/${templateId}/versions`,
    {
      method: "GET",
    }
  );
  return response.data;
}

export async function restoreTemplateVersion(
  templateId: number,
  versionId: number
) {
  const response = await requestJson<PromptTemplate>(
    `/api/v1/prompts/${templateId}/versions/${versionId}/restore`,
    {
      method: "POST",
    }
  );
  return response.data;
}

export async function createAuditAnnotation(
  payload: Omit<AuditManualAnnotationItem, "id" | "annotated_at" | "created_at">
) {
  const response = await requestJson<AuditManualAnnotationItem>(
    "/api/v1/audit/annotations",
    {
      method: "POST",
      data: payload,
    }
  );
  return response.data;
}

export async function listAuditAnnotations() {
  const response = await requestJson<AuditManualAnnotationItem[]>(
    "/api/v1/audit/annotations",
    {
      method: "GET",
    }
  );
  return response.data;
}

export async function generateAuditEvaluationReport() {
  const response = await requestJson<AuditEvaluationReportItem>(
    "/api/v1/audit/evaluation/report",
    {
      method: "POST",
    }
  );
  return response.data;
}

export async function listAuditEvaluationReports() {
  const response = await requestJson<AuditEvaluationReportItem[]>(
    "/api/v1/audit/evaluation/reports",
    {
      method: "GET",
    }
  );
  return response.data;
}
