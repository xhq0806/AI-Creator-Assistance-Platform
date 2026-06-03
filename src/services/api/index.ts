// ── API Barrel Export ──────────────────────────────────────
// 新代码建议从具体领域模块导入：
//   import { login } from "@/services/api/auth";
//   import { generateContent } from "@/services/api/ai";

export { requestJson } from "./client";
export type { ApiResponse } from "./types";
export type {
  ArticleDraft, AuditResult, HotArticle, PromptTemplate, MaterialItem,
  ArticleVersion, GenerationRecord, PromptTeam, PromptTemplateVersion,
  UploadCredential, AuditManualAnnotationItem, OfflineDraftSyncResult,
} from "./types";

export { login, register, refreshAuthToken } from "./auth";
export {
  generateContent, generateImage, generateVideo,
  auditContent, evaluateQuality,
  fetchGenerationHistory, deleteGenerationHistory,
} from "./ai";
export {
  saveDraft, fetchLatestDraft, fetchArticle, fetchArticleVersions,
  restoreArticleVersion, withdrawArticle, sendArticleFeedback,
  syncOfflineDrafts, searchArticles, fetchHotArticles,
} from "./articles";
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
} from "./resources";
