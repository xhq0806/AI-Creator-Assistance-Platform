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
    { path: "/profile/nickname", component: "profile/nickname" },
    { path: "/profile/likes", component: "profile/likes" },
    { path: "/profile/favorites", component: "profile/favorites" },
    { path: "/profile/works", component: "profile/works" },
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
