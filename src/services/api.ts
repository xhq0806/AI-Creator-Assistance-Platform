import type { CurrentUser } from '@/app';

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
  status?: 'draft' | 'pending_review' | 'published' | 'rejected';
  quality_score?: number;
};

export type AuditResult = {
  is_compliant: boolean;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  accuracy: number;
  safe_alternative?: string;
};

export type HotArticle = Required<Pick<ArticleDraft, 'id' | 'title' | 'content'>> & {
  user_id: number;
  cover_url?: string;
  author?: { id: number; username: string };
  created_at?: string;
  updated_at?: string;
  view_count: number;
  quality_score: number;
  score: number;
};

async function requestJson<T>(url: string, options: RequestInit & { data?: unknown; params?: Record<string, unknown> } = {}) {
  const rawUser = window.localStorage.getItem('ai_creator_user');
  const token = rawUser ? (JSON.parse(rawUser) as CurrentUser).token : '';
  const searchParams = new URLSearchParams();

  Object.entries(options.params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const response = await fetch(`${url}${searchParams.size ? `?${searchParams.toString()}` : ''}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.data ? JSON.stringify(options.data) : options.body,
  });
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || payload.code !== 200) {
    throw new Error(payload.message || '请求失败');
  }

  return payload;
}

export async function login(payload: { account: string; password: string }) {
  const response = await requestJson<CurrentUser>('/api/v1/auth/login', {
    method: 'POST',
    data: payload,
  });

  return response.data;
}

export async function register(payload: { username: string; password: string; phone?: string; email?: string }) {
  const response = await requestJson<CurrentUser>('/api/v1/auth/register', {
    method: 'POST',
    data: payload,
  });

  return response.data;
}

export async function generateContent(payload: {
  prompt: string;
  mode: 'full_generation' | 'rewrite' | 'outline';
  materials?: string[];
}) {
  const response = await requestJson<{ title: string; content: string; suggested_tags: string[] }>('/api/v1/ai/generate', {
    method: 'POST',
    data: payload,
  });

  return response.data;
}

export async function generateImage(payload: { prompt?: string; title?: string; content?: string; materials?: string[] }) {
  const response = await requestJson<{ media_urls: string[]; cover_prompt: string; alt_text: string; provider?: string }>(
    '/api/v1/ai/generate-image',
    {
      method: 'POST',
      data: payload,
    },
  );

  return response.data;
}

export async function auditContent(payload: Pick<ArticleDraft, 'title' | 'content'>) {
  const response = await requestJson<AuditResult>('/api/v1/ai/audit', {
    method: 'POST',
    data: payload,
  });

  return response.data;
}

export async function saveDraft(payload: ArticleDraft) {
  const response = await requestJson<ArticleDraft & { id: number }>('/api/v1/articles/draft', {
    method: 'POST',
    data: payload,
  });

  return response.data;
}

export async function fetchLatestDraft() {
  const response = await requestJson<(ArticleDraft & { id: number }) | null>('/api/v1/articles/latest-draft', {
    method: 'GET',
  });

  return response.data;
}

export async function fetchArticle(id: number) {
  const response = await requestJson<HotArticle & { status: NonNullable<ArticleDraft['status']>; media_urls?: string[] }>(
    `/api/v1/articles/${id}`,
    {
      method: 'GET',
    },
  );

  return response.data;
}

export async function syncOfflineDrafts(payload: ArticleDraft[]) {
  const response = await requestJson<{ synced: number }>('/api/v1/articles/drafts/sync', {
    method: 'POST',
    data: { drafts: payload },
  });

  return response.data;
}

export async function fetchHotArticles(cursor?: string) {
  const response = await requestJson<{ list: HotArticle[]; nextCursor?: string }>('/api/v1/rank/hot', {
    method: 'GET',
    params: { cursor, limit: 10 },
  });

  return response.data;
}

export async function syncDistribution(payload: { article_id: number; platforms: string[] }) {
  const response = await requestJson<{ toutiao_item_id?: string; douyin_item_id?: string; sync_status: string }>(
    '/api/v1/distribution/sync',
    {
      method: 'POST',
      data: payload,
    },
  );

  return response.data;
}
