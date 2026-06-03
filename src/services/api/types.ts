// ── API 通用类型 ──────────────────────────────────────────
export type ApiResponse<T> = { code: number; data: T; message?: string };

export type ArticleDraft = {
  id?: number;
  title: string;
  content: string;
  media_urls?: string[];
  category?: string;
  status?: "draft" | "pending_review" | "published" | "rejected" | "withdrawn";
  quality_score?: number;
  prompt?: string;
};

export type AuditResult = {
  is_compliant: boolean;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  reason: string;
  accuracy: number;
  safe_alternative?: string;
};

export type HotArticle = Required<Pick<ArticleDraft, "id" | "title" | "content">> & {
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
  id: number; user_id: number; name: string; url: string;
  file_key?: string; file_size?: number; mime_type?: string;
  media_type: "image" | "video" | "audio";
  risk_status: "approved" | "rejected"; risk_reason: string;
};

export type ArticleVersion = Required<Pick<ArticleDraft, "id" | "title" | "content">> & {
  article_id: number; user_id: number; version_no: number;
  media_urls?: string[]; status: NonNullable<ArticleDraft["status"]>;
  quality_score: number;
  source: "draft_save" | "publish" | "offline_sync" | "restore" | "withdraw";
  created_at?: string;
};

export type GenerationRecord = {
  id: string; prompt: string; mode: string;
  result: { title: string; content: string; suggested_tags?: string[]; media_urls?: string[] };
  created_at: string;
};

export type PromptTeam = { id: number; name: string; owner_id: number; created_at?: string };
export type PromptTemplateVersion = {
  id: number; template_id: number; version_no: number;
  name: string; category: string; content: string;
  change_note?: string; created_by: number; created_at?: string;
};

export type UploadCredential = {
  provider: string; upload_url: string; access_url: string; file_key: string;
  material_id?: number; expired_at: number;
  policy?: string; signature?: string; access_id?: string; oss_key?: string;
};

export type AuditManualAnnotationItem = {
  id: number; article_id?: number | null; title: string; content: string;
  ai_prediction_risk: "SAFE" | "RISK_LOW" | "RISK_MEDIUM" | "RISK_HIGH";
  ground_truth_risk: "SAFE" | "RISK_LOW" | "RISK_MEDIUM" | "RISK_HIGH";
  risk_category: "NONE" | "PORN" | "GAMBLING" | "DRUG" | "POLITICAL" | "OTHER";
  annotation_note?: string; annotated_at?: string;
};

export type OfflineDraftSyncResult = {
  synced: number;
  results: { localId?: string; serverId?: number; action?: "created" | "updated"; skipped?: boolean; reason?: string }[];
};
