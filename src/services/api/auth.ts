// ── 认证 API ──────────────────────────────────────────────
import type { CurrentUser } from "@/app";
import { requestJson } from "./client";

export async function login(payload: { account: string; password: string }) {
  const res = await requestJson<CurrentUser>("/api/v1/auth/login", { method: "POST", data: payload });
  return res.data;
}

export async function register(payload: { username: string; password: string; phone?: string; email?: string }) {
  const res = await requestJson<CurrentUser>("/api/v1/auth/register", { method: "POST", data: payload });
  return res.data;
}

export async function refreshAuthToken() {
  const rawUser = window.localStorage.getItem("ai_creator_user");
  const user = rawUser ? (JSON.parse(rawUser) as CurrentUser) : null;
  if (!user?.refreshToken) throw new Error("无 refresh token");
  const res = await requestJson<CurrentUser>("/api/v1/auth/refresh", {
    method: "POST", data: { refreshToken: user.refreshToken }, skipRefresh: true,
  });
  window.localStorage.setItem("ai_creator_user", JSON.stringify(res.data));
  return res.data;
}
