/**
 * Tests for the API service layer.
 *
 * These tests verify request construction, error handling, token management,
 * and query parameter serialization using a mocked global fetch.
 */

import type { CurrentUser } from "@/app";

// We test the module by mocking fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Clear localStorage and reset mocks before each test
beforeEach(() => {
  localStorage.clear();
  mockFetch.mockReset();
});

function setStoredUser(user: Partial<CurrentUser>) {
  localStorage.setItem(
    "ai_creator_user",
    JSON.stringify({
      id: 1,
      username: "test",
      token: "test-token",
      refreshToken: "test-refresh",
      ...user,
    })
  );
}

function mockJsonResponse(data: unknown, status = 200, ok = true) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    json: async () => ({ code: status < 400 ? 200 : status, data }),
  });
}

// We test the exported functions indirectly through fetch simulation.
// Re-import inside tests since the module caches the token at load time.
describe("API Service (api.ts)", () => {
  describe("requestJson — authentication", () => {
    it("includes Bearer token when user is stored", async () => {
      setStoredUser({ token: "my-jwt-token" });
      mockJsonResponse({ status: "ok" });

      // Dynamic import to get fresh module state
      const { login } = await import("@/services/api");

      mockFetch.mockReset();
      mockJsonResponse({ id: 1, username: "test", token: "new-token" });

      await login({ account: "admin", password: "admin123" });

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers;
      expect(headers?.Authorization).toBe("Bearer my-jwt-token");
    });

    it("sends request without token when user is not stored", async () => {
      mockJsonResponse({ id: 1, username: "test", token: "t" });
      mockFetch.mockReset();
      mockJsonResponse({ id: 1, username: "test", token: "t" });

      const { login } = await import("@/services/api");
      await login({ account: "admin", password: "admin123" });

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers || {};
      expect(headers?.Authorization || "").toBe("");
    });
  });

  describe("requestJson — query parameters", () => {
    it("appends query params to URL", async () => {
      mockJsonResponse({ list: [] });
      const { fetchHotArticles } = await import("@/services/api");

      await fetchHotArticles({ category: "科技", time_range: "today" });

      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toContain("category=");
      expect(url).toContain("time_range=");
    });

    it("omits undefined/null/empty params", async () => {
      mockJsonResponse({ list: [] });
      const { fetchHotArticles } = await import("@/services/api");

      await fetchHotArticles({});

      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).not.toContain("?");
    });
  });

  describe("requestJson — error handling", () => {
    it("throws on non-200 responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ code: 500, message: "Internal error" }),
      });

      const { fetchHotArticles } = await import("@/services/api");
      await expect(fetchHotArticles()).rejects.toThrow("Internal error");
    });

    it("throws when response is not valid JSON", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const { fetchHotArticles } = await import("@/services/api");
      await expect(fetchHotArticles()).rejects.toThrow("响应解析失败");
    });
  });

  describe("requestJson — token refresh", () => {
    it("attempts refresh on 401 with refresh token", async () => {
      setStoredUser({ token: "expired", refreshToken: "rt" });

      // First call: 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ code: 401, message: "Expired" }),
      });
      // Refresh call: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          code: 200,
          data: { id: 1, username: "test", token: "new-token", refreshToken: "new-rt" },
        }),
      });
      // Retry call: success
      mockJsonResponse({ list: [] });

      const { fetchHotArticles } = await import("@/services/api");
      await fetchHotArticles();

      // Verify refresh was called
      const refreshCall = mockFetch.mock.calls[1];
      expect(refreshCall[0]).toContain("/auth/refresh");
    });

    it("preserves frontend fields while trusting refreshed auth fields", async () => {
      localStorage.setItem(
        "ai_creator_user",
        JSON.stringify({
          id: 1,
          username: "test",
          role: "admin",
          status: "disabled",
          token: "expired",
          refreshToken: "old-rt",
          workspaceDraftId: "draft-1",
        })
      );

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ code: 401, message: "Expired" }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          code: 200,
          data: {
            role: "editor",
            status: "active",
            token: "new-token",
            refreshToken: "new-rt",
          },
        }),
      });
      mockJsonResponse({ list: [] });

      const { fetchHotArticles } = await import("@/services/api");
      await fetchHotArticles();

      const stored = JSON.parse(
        localStorage.getItem("ai_creator_user") || "{}"
      );
      expect(stored.workspaceDraftId).toBe("draft-1");
      expect(stored.role).toBe("editor");
      expect(stored.status).toBe("active");
      expect(stored.token).toBe("new-token");
      expect(stored.refreshToken).toBe("new-rt");
    });
  });
});
