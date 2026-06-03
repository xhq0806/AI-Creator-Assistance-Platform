// ── API Client — 核心请求函数 ─────────────────────────────
import type { CurrentUser } from "@/app";
import type { ApiResponse } from "./types";

export async function requestJson<T>(
  url: string,
  options: RequestInit & {
    data?: unknown;
    params?: Record<string, unknown>;
    skipRefresh?: boolean;
  } = {}
): Promise<ApiResponse<T>> {
  const rawUser = window.localStorage.getItem("ai_creator_user");
  let user: CurrentUser | null = null;
  try { user = rawUser ? (JSON.parse(rawUser) as CurrentUser) : null; } catch { user = null; }
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
  try { payload = (await response.json()) as ApiResponse<T>; } catch { throw new Error("响应解析失败"); }

  // Token refresh
  if (response.status === 401 && user?.refreshToken && !options.skipRefresh) {
    try {
      const refreshRes = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: user.refreshToken }),
      });
      const refreshPayload = await refreshRes.json();
      if (refreshRes.ok && refreshPayload.code === 200) {
        const refreshed = refreshPayload.data as CurrentUser;
        window.localStorage.setItem("ai_creator_user", JSON.stringify(refreshed));
        const retryRes = await fetch(
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
        const retryPayload = (await retryRes.json()) as ApiResponse<T>;
        if (!retryRes.ok || retryPayload.code !== 200) {
          throw new Error(retryPayload.message || "请求失败");
        }
        return retryPayload;
      }
    } catch { /* fall through */ }
    window.localStorage.removeItem("ai_creator_user");
    window.location.href = "/login";
    throw new Error("登录已过期，请重新登录");
  }

  if (!response.ok || payload.code !== 200) {
    throw new Error(payload.message || "请求失败");
  }
  return payload;
}
