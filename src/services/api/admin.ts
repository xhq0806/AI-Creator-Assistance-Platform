import { requestJson } from './client';
import type { ApiResponse } from './types';

// ── Dashboard ──────────────────────────────────────────────
export interface DashboardOverview {
  totalUsers: number; activeUsers: number; disabledUsers: number;
  totalArticles: number; publishedArticles: number;
  pendingReview: number; rejectedArticles: number;
  generationsToday: number;
}

export interface TrendData {
  series: { date: string; articles: number; users: number }[];
}

export async function fetchDashboardOverview() {
  return requestJson<DashboardOverview>('/api/v1/admin/dashboard/overview');
}

export async function fetchDashboardTrends(days = 30) {
  return requestJson<TrendData>(`/api/v1/admin/dashboard/trends?days=${days}`);
}

// ── Users ──────────────────────────────────────────────────
export interface AdminUser {
  id: number; username: string; phone: string; email: string;
  role: 'user' | 'editor' | 'admin'; status: 'active' | 'disabled';
  created_at: string; updated_at: string;
}

export interface AdminUserStats {
  total: number;
  byRole: { user: number; editor: number; admin: number };
  byStatus: { active: number; disabled: number };
}

export async function fetchAdminUserStats() {
  return requestJson<AdminUserStats>('/api/v1/admin/users/stats');
}

export async function fetchAdminUsers(params: {
  page?: number; pageSize?: number; search?: string;
  role?: string; status?: string;
} = {}) {
  return requestJson<{ list: AdminUser[]; total: number; page: number; pageSize: number }>(
    '/api/v1/admin/users', { params: params as Record<string, unknown> }
  );
}

export async function fetchAdminUser(id: number) {
  return requestJson<AdminUser & { articleCount: number }>(`/api/v1/admin/users/${id}`);
}

export async function updateAdminUser(id: number, data: {
  role?: string; status?: string; phone?: string | null; email?: string | null;
}) {
  return requestJson<AdminUser>(`/api/v1/admin/users/${id}`, {
    method: 'PUT', data,
  });
}

export async function disableAdminUser(id: number) {
  return requestJson<{ message: string }>(`/api/v1/admin/users/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchAdminUserArticles(id: number, params: { page?: number; pageSize?: number } = {}) {
  return requestJson<{ list: { id: number; title: string; status: string; category: string; quality_score: number; created_at: string }[]; total: number }>(
    `/api/v1/admin/users/${id}/articles`, { params: params as Record<string, unknown> }
  );
}

// ── Articles ───────────────────────────────────────────────
export async function fetchAdminArticleStats() {
  return requestJson<{ byStatus: Record<string, number>; byCategory: Record<string, number>; todayCount: number }>(
    '/api/v1/admin/articles/stats'
  );
}

export async function fetchAdminArticles(params: {
  page?: number; pageSize?: number; status?: string; category?: string;
  userId?: number; dateFrom?: string; dateTo?: string;
} = {}) {
  return requestJson<{ list: any[]; total: number; page: number; pageSize: number }>(
    '/api/v1/admin/articles', { params: params as Record<string, unknown> }
  );
}

export async function fetchAdminArticle(id: number) {
  return requestJson<any>(`/api/v1/admin/articles/${id}`);
}

export async function reviewAdminArticle(id: number, data: { action: 'approve' | 'reject'; reason?: string }) {
  return requestJson<any>(`/api/v1/admin/articles/${id}/review`, {
    method: 'POST', data,
  });
}

export async function forceWithdrawArticle(id: number) {
  return requestJson<any>(`/api/v1/admin/articles/${id}/withdraw`, {
    method: 'POST',
  });
}

export async function forceDeleteArticle(id: number) {
  return requestJson<{ message: string }>(`/api/v1/admin/articles/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchArticleAnalytics(id: number) {
  return requestJson<any>(`/api/v1/admin/articles/${id}/analytics`);
}

// ── Prompts ────────────────────────────────────────────────
export async function fetchAdminPrompts(params: {
  page?: number; pageSize?: number; search?: string; visibility?: string; userId?: number;
} = {}) {
  return requestJson<{ list: any[]; total: number; page: number; pageSize: number }>(
    '/api/v1/admin/prompts', { params: params as Record<string, unknown> }
  );
}

export async function createSystemPrompt(data: { name: string; category?: string; content: string; visibility?: string }) {
  return requestJson<any>('/api/v1/admin/prompts', {
    method: 'POST', data,
  });
}

export async function updateAdminPrompt(id: number, data: { name?: string; category?: string; content?: string; visibility?: string }) {
  return requestJson<any>(`/api/v1/admin/prompts/${id}`, {
    method: 'PUT', data,
  });
}

export async function deleteAdminPrompt(id: number) {
  return requestJson<{ message: string }>(`/api/v1/admin/prompts/${id}`, {
    method: 'DELETE',
  });
}

// ── Materials ──────────────────────────────────────────────
export async function fetchAdminMaterials(params: {
  page?: number; pageSize?: number; userId?: number; riskStatus?: string;
} = {}) {
  return requestJson<{ list: any[]; total: number; page: number; pageSize: number }>(
    '/api/v1/admin/materials', { params: params as Record<string, unknown> }
  );
}

export async function overrideMaterialRisk(id: number, data: { riskStatus: string; reason?: string }) {
  return requestJson<any>(`/api/v1/admin/materials/${id}/risk-override`, {
    method: 'POST', data,
  });
}

// ── System Config ──────────────────────────────────────────
export async function fetchRankingWeights() {
  return requestJson<{ weights: Record<string, number>; defaults: Record<string, number> }>(
    '/api/v1/admin/system/ranking-weights'
  );
}

export async function updateRankingWeights(data: Record<string, number>) {
  return requestJson<{ weights: Record<string, number>; message: string }>(
    '/api/v1/admin/system/ranking-weights', { method: 'PUT', data }
  );
}

export async function fetchAdminAIConfig() {
  return requestJson<any>('/api/v1/admin/system/ai-config');
}

export async function updateAdminAIConfig(data: any) {
  return requestJson<any>('/api/v1/admin/system/ai-config', { method: 'PUT', data });
}

export async function fetchAdminRateLimit() {
  return requestJson<any>('/api/v1/admin/system/rate-limit');
}

export async function updateAdminRateLimit(data: any) {
  return requestJson<any>('/api/v1/admin/system/rate-limit', { method: 'PUT', data });
}

export async function fetchAuditCategories() {
  return requestJson<{ categories: { key: string; label: string; enabled: boolean }[] }>(
    '/api/v1/admin/system/audit-categories'
  );
}

export async function updateAuditCategories(data: { categories: { key: string; label: string; enabled: boolean }[] }) {
  return requestJson<any>('/api/v1/admin/system/audit-categories', { method: 'PUT', data });
}

// ── Audit Management ───────────────────────────────────────
export async function fetchAdminAuditAnnotations(params: {
  page?: number; pageSize?: number; riskCategory?: string; riskLevel?: string;
} = {}) {
  return requestJson<{ list: any[]; total: number; page: number; pageSize: number }>(
    '/api/v1/admin/audit/annotations', { params: params as Record<string, unknown> }
  );
}

export async function fetchAdminAuditReports(params: { page?: number; pageSize?: number } = {}) {
  return requestJson<{ list: any[]; total: number; page: number; pageSize: number }>(
    '/api/v1/admin/audit/reports', { params: params as Record<string, unknown> }
  );
}

export async function deleteAuditReport(id: number) {
  return requestJson<{ message: string }>(`/api/v1/admin/audit/reports/${id}`, {
    method: 'DELETE',
  });
}
