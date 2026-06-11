import { defineConfig } from "umi";

export default defineConfig({
  plugins: [
    "@umijs/plugins/dist/antd",
    "@umijs/plugins/dist/initial-state",
    "@umijs/plugins/dist/model",
  ],
  routes: [
    { path: "/", redirect: "/index" },
    { path: "/index", component: "index/index" },
    { path: "/login", component: "login/index" },
    { path: "/creator", component: "creator/index", wrappers: ["@/wrappers/auth"] },
    { path: "/creator/:id", component: "creator/index", wrappers: ["@/wrappers/auth"] },
    { path: "/article/:id", component: "article/index" },
    { path: "/profile/settings", component: "profile/settings", wrappers: ["@/wrappers/auth"] },
    { path: "/profile/password", component: "profile/password", wrappers: ["@/wrappers/auth"] },
    { path: "/profile/nickname", component: "profile/nickname", wrappers: ["@/wrappers/auth"] },
    { path: "/audit", component: "audit/index", wrappers: ["@/wrappers/staff"] },
    { path: "/workspace", component: "workspace/index", wrappers: ["@/wrappers/auth"] },
    { path: "/search", component: "search/index" },
    { path: "/profile/likes", component: "profile/likes", wrappers: ["@/wrappers/auth"] },
    { path: "/profile/favorites", component: "profile/favorites", wrappers: ["@/wrappers/auth"] },
    { path: "/profile/works", component: "profile/works", wrappers: ["@/wrappers/auth"] },
    // ── Admin routes ─────────────────────────────────────────
    { path: "/admin", component: "@/layouts/admin",
      routes: [
        { path: "", redirect: "/admin/dashboard" },
        { path: "dashboard", component: "admin/dashboard/index" },
        { path: "users", component: "admin/users/index" },
        { path: "articles", component: "admin/articles/index" },
        { path: "prompts", component: "admin/prompts/index" },
        { path: "materials", component: "admin/materials/index" },
        { path: "audit", component: "admin/audit-management/index" },
        { path: "system", component: "admin/system/index" },
      ],
    },
  ],
  antd: {},
  model: {},
  initialState: {},
  codeSplitting: {
    jsStrategy: "granularChunks",
  },
  proxy: {
    "/api": {
      target: "http://localhost:3000",
      changeOrigin: true,
    },
    "/uploads": {
      target: "http://localhost:3000",
      changeOrigin: true,
    },
  },
  npmClient: "pnpm",
});
