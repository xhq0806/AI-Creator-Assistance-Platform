// ── 向后兼容层 — 重新导出拆分后的 API 模块 ─────────────────
// 新代码建议直接从领域模块导入：
//   import { login } from "@/services/api/auth";
//   import { generateContent } from "@/services/api/ai";
//   import { saveDraft } from "@/services/api/articles";

export { requestJson } from "./api/client";
export type { ApiResponse } from "./api/types";
export type {
  ArticleDraft, AuditResult, HotArticle, PromptTemplate, MaterialItem,
  ArticleVersion, GenerationRecord, PromptTeam, PromptTemplateVersion,
  UploadCredential, AuditManualAnnotationItem, OfflineDraftSyncResult,
} from "./api/types";

export { login, register, refreshAuthToken } from "./api/auth";
export {
  generateContent, generateImage, generateVideo,
  auditContent, evaluateQuality,
  fetchGenerationHistory, deleteGenerationHistory,
} from "./api/ai";
export {
  saveDraft, fetchLatestDraft, fetchArticle, fetchArticleVersions,
  restoreArticleVersion, withdrawArticle, sendArticleFeedback,
  syncOfflineDrafts, searchArticles, fetchHotArticles,
} from "./api/articles";
export {
  fetchPromptTemplates, createPromptTemplate, updatePromptTemplate,
  deletePromptTemplate, markPromptTemplateUsed, saveTemplateWithVersion,
  fetchTemplateVersions, restoreTemplateVersion,
  createPromptTeam, listMyPromptTeams,
  fetchMaterials, createMaterial, deleteMaterial,
  getUploadCredential, confirmUpload,
  syncDistribution,
  fetchAuditAnnotations, createAuditAnnotation, deleteAuditAnnotation,
  seedAuditSamples, generateAuditReport, fetchAuditReports, fetchAuditReportDetail,
  fetchMyProfile, updateMyProfile, changeMyPassword,
  fetchMyArticles, fetchMyFeedbackArticles,
} from "./api/resources";
