// ── 资源管理 API：模板 | 素材 | 分发 | 上传 | 审核 ─────────
import { requestJson } from "./client";
import type {
  PromptTemplate, PromptTemplateVersion, PromptTeam,
  MaterialItem, UploadCredential, AuditManualAnnotationItem,
  AuditEvaluationReportItem,
} from "./types";

// ── Prompt 模板 ────────────────────────────────────────────
export async function fetchPromptTemplates() {
  return (await requestJson<PromptTemplate[]>("/api/v1/prompts", { method: "GET" })).data;
}
export async function createPromptTemplate(payload: Pick<PromptTemplate, "name" | "category" | "content">) {
  return (await requestJson<PromptTemplate>("/api/v1/prompts", { method: "POST", data: payload })).data;
}
export async function updatePromptTemplate(id: number, payload: { name?: string; category?: string; content?: string }) {
  return (await requestJson<PromptTemplate>(`/api/v1/prompts/${id}`, { method: "PUT", data: payload })).data;
}
export async function deletePromptTemplate(id: number) {
  return (await requestJson<{ deleted: boolean }>(`/api/v1/prompts/${id}`, { method: "DELETE" })).data;
}
export async function markPromptTemplateUsed(id: number) {
  return (await requestJson<PromptTemplate>(`/api/v1/prompts/${id}/use`, { method: "POST" })).data;
}
export async function saveTemplateWithVersion(payload: {
  id?: number; name: string; category: string; content: string;
  change_note?: string; visibility?: string; team_id?: number | null;
}) {
  return (await requestJson<PromptTemplate>("/api/v1/prompts/with-version", { method: "POST", data: payload })).data;
}
export async function fetchTemplateVersions(templateId: number) {
  return (await requestJson<PromptTemplateVersion[]>(`/api/v1/prompts/${templateId}/versions`, { method: "GET" })).data;
}
export async function restoreTemplateVersion(templateId: number, versionId: number) {
  return (await requestJson<PromptTemplate>(`/api/v1/prompts/${templateId}/versions/${versionId}/restore`, { method: "POST" })).data;
}

// ── Prompt 团队 ────────────────────────────────────────────
export async function createPromptTeam(payload: { name: string }) {
  return (await requestJson<PromptTeam>("/api/v1/prompt-teams", { method: "POST", data: payload })).data;
}
export async function listMyPromptTeams() {
  return (await requestJson<PromptTeam[]>("/api/v1/prompt-teams", { method: "GET" })).data;
}

// ── 素材管理 ───────────────────────────────────────────────
export async function fetchMaterials() {
  return (await requestJson<MaterialItem[]>("/api/v1/materials", { method: "GET" })).data;
}
export async function createMaterial(payload: { name: string; url: string }) {
  return (await requestJson<MaterialItem>("/api/v1/materials", { method: "POST", data: payload })).data;
}
export async function deleteMaterial(id: number) {
  return (await requestJson<{ deleted: boolean }>(`/api/v1/materials/${id}`, { method: "DELETE" })).data;
}

// ── 上传 ───────────────────────────────────────────────────
export async function getUploadCredential(payload: { file_name: string; file_type?: string }) {
  return (await requestJson<UploadCredential>("/api/v1/upload/credential", { method: "POST", data: payload })).data;
}
export async function confirmUpload(payload: { material_id: number; file_size?: number; mime_type?: string }) {
  return (await requestJson<MaterialItem>("/api/v1/upload/confirm", { method: "POST", data: payload })).data;
}

// ── 分发 ───────────────────────────────────────────────────
export async function syncDistribution(payload: { article_id: number; platforms: string[] }) {
  return (await requestJson<{ toutiao_item_id?: string; douyin_item_id?: string; sync_status: string }>(
    "/api/v1/distribution/sync", { method: "POST", data: payload }
  )).data;
}

// ── 审核标注 ───────────────────────────────────────────────
export async function fetchAuditAnnotations(params?: { risk_category?: string; page?: number; pageSize?: number }) {
  return (await requestJson<{ total: number; list: AuditManualAnnotationItem[] }>(
    "/api/v1/audit/annotations", { method: "GET", params: params as Record<string, unknown> }
  )).data;
}
export async function createAuditAnnotation(payload: Omit<AuditManualAnnotationItem, "id" | "annotated_at" | "created_at">) {
  return (await requestJson<AuditManualAnnotationItem>("/api/v1/audit/annotations", { method: "POST", data: payload })).data;
}
export async function deleteAuditAnnotation(id: number) {
  return (await requestJson<{ deleted: boolean }>(`/api/v1/audit/annotations/${id}`, { method: "DELETE" })).data;
}
export async function seedAuditSamples(clearExisting?: boolean) {
  return (await requestJson<{ created: number }>("/api/v1/audit/seed-samples", { method: "POST", data: { clear_existing: !!clearExisting } })).data;
}
export async function generateAuditReport() {
  return (await requestJson<AuditEvaluationReportItem>("/api/v1/audit/evaluation/report", { method: "POST" })).data;
}
export async function fetchAuditReports() {
  return (await requestJson<AuditEvaluationReportItem[]>("/api/v1/audit/evaluation/reports", { method: "GET" })).data;
}
export async function fetchAuditReportDetail(id: number) {
  return (await requestJson<AuditEvaluationReportItem>(`/api/v1/audit/evaluation/reports/${id}`, { method: "GET" })).data;
}

// ── 用户资料 ───────────────────────────────────────────────
export async function fetchMyProfile() {
  return (await requestJson<any>("/api/v1/users/me", { method: "GET" })).data;
}
export async function updateMyProfile(payload: { username?: string; phone?: string; email?: string }) {
  return (await requestJson<any>("/api/v1/users/me", { method: "PUT", data: payload })).data;
}
export async function changeMyPassword(payload: { oldPassword: string; newPassword: string }) {
  return (await requestJson<{ message: string }>("/api/v1/users/me/password", { method: "POST", data: payload })).data;
}
export async function fetchMyArticles() {
  return (await requestJson<any[]>("/api/v1/users/me/articles", { method: "GET" })).data;
}
export async function fetchMyFeedbackArticles(type: "like" | "favorite") {
  return (await requestJson<any[]>(`/api/v1/users/me/feedback/${type}`, { method: "GET" })).data;
}
