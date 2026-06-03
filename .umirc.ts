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
    { path: "/creator", component: "creator/index" },
    { path: "/creator/:id", component: "creator/index" },
    { path: "/article/:id", component: "article/index" },
    { path: "/profile/settings", component: "profile/settings" },
    { path: "/profile/password", component: "profile/password" },
    { path: "/profile/nickname", component: "profile/nickname" },
    { path: "/audit", component: "audit/index" },
    { path: "/workspace", component: "workspace/index" },
    { path: "/search", component: "search/index" },
    { path: "/profile/likes", component: "profile/likes" },
    { path: "/profile/favorites", component: "profile/favorites" },
    { path: "/profile/works", component: "profile/works" },
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
  },
  npmClient: "pnpm",
});
