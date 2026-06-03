const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { port, isProduction } = require("./config/env");
const { syncModels } = require("./models");
const { requireAuth } = require("./middleware/auth");
const { requireAdmin, requireStaff } = require("./middleware/adminAuth");
const { aiRateLimiter } = require("./middleware/rateLimiter");
const {
  validate,
  validateParams,
  validateQuery,
} = require("./middleware/validate");
const errorHandler = require("./middleware/errorHandler");
const requestLogger = require("./middleware/requestLogger");
const requestIdMiddleware = require("./middleware/requestId");
const { logger } = require("./utils/logger");
const authController = require("./controllers/auth.controller");
const aiController = require("./controllers/ai.controller");
const articleController = require("./controllers/article.controller");
const rankingController = require("./controllers/ranking.controller");
const distributionController = require("./controllers/distribution.controller");
const promptController = require("./controllers/prompt.controller");
const materialController = require("./controllers/material.controller");
const uploadController = require("./controllers/upload.controller");
const promptTeamController = require("./controllers/prompt-team.controller");
const auditAnnotationController = require("./controllers/audit-annotation.controller");
const userController = require("./controllers/user.controller");
const adminDashboardController = require("./controllers/admin/dashboard.controller");
const adminUserController = require("./controllers/admin/user.controller");
const adminArticleController = require("./controllers/admin/article.controller");
const adminPromptController = require("./controllers/admin/prompt.controller");
const adminMaterialController = require("./controllers/admin/material.controller");
const adminSystemController = require("./controllers/admin/system.controller");
const adminAuditController = require("./controllers/admin/audit-management.controller");

const app = express();

// ── 全局中间件 ──────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(requestIdMiddleware);
app.use(requestLogger());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ── 增强健康检查 ────────────────────────────────────────────
async function checkDatabaseHealth() {
  const { sequelize } = require("./models");
  try {
    await sequelize.authenticate();
    return { mysql: "connected" };
  } catch (error) {
    return { mysql: "disconnected", mysql_error: error.message };
  }
}

async function checkRedisHealth() {
  try {
    const redis = require("./config/redis");
    await redis.ping();
    return { redis: "connected" };
  } catch (error) {
    return { redis: "disconnected", redis_error: error.message };
  }
}

app.get("/api/v1/health", async (req, res) => {
  const [dbStatus, redisStatus] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
  ]);

  const allUp = dbStatus.mysql === "connected" && redisStatus.redis === "connected";

  res.status(allUp ? 200 : 503).json({
    code: allUp ? 200 : 503,
    data: {
      status: allUp ? "ok" : "degraded",
      version: "1.1.0",
      uptime: Math.floor(process.uptime()),
      ...dbStatus,
      ...redisStatus,
    },
  });
});

// ── Swagger API 文档 ────────────────────────────────────────
try {
  const swaggerUi = require("swagger-ui-express");
  const swaggerSpec = require("./swagger/config");
  app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api/v1/docs.json", (req, res) => res.json(swaggerSpec));
  logger.info("API docs available at /api/v1/docs");
} catch {
  logger.warn("swagger-ui-express not installed, skipping API docs");
}

// ── 认证路由 ────────────────────────────────────────────────
app.post("/api/v1/auth/login", validate("login"), authController.login);
app.post(
  "/api/v1/auth/register",
  validate("register"),
  authController.register
);
app.post("/api/v1/auth/refresh", authController.refresh);

// ── AI 能力路由 ─────────────────────────────────────────────
app.post(
  "/api/v1/ai/generate",
  requireAuth,
  aiRateLimiter(10),
  validate("aiGenerate"),
  aiController.generate
);
app.post(
  "/api/v1/ai/generate-image",
  requireAuth,
  aiRateLimiter(8),
  validate("aiGenerateImage"),
  aiController.generateImage
);
app.post(
  "/api/v1/ai/generate-video",
  requireAuth,
  aiRateLimiter(4),
  validate("aiGenerateVideo"),
  aiController.generateVideo
);
app.post(
  "/api/v1/ai/audit",
  requireAuth,
  aiRateLimiter(20),
  validate("aiAudit"),
  aiController.audit
);
app.post(
  "/api/v1/ai/quality",
  requireAuth,
  aiRateLimiter(20),
  validate("aiQuality"),
  aiController.quality
);

// ── Prompt 模板路由 ─────────────────────────────────────────
app.get("/api/v1/prompts", requireAuth, promptController.list);
app.post(
  "/api/v1/prompts",
  requireAuth,
  validate("createPrompt"),
  promptController.create
);
app.put(
  "/api/v1/prompts/:id",
  requireAuth,
  validateParams("idParam"),
  validate("updatePrompt"),
  promptController.update
);
app.delete(
  "/api/v1/prompts/:id",
  requireAuth,
  validateParams("idParam"),
  promptController.remove
);
app.post(
  "/api/v1/prompts/:id/use",
  requireAuth,
  validateParams("idParam"),
  promptController.markUsed
);

// ── 素材管理路由 ────────────────────────────────────────────
app.get("/api/v1/materials", requireAuth, materialController.list);
app.post(
  "/api/v1/materials",
  requireAuth,
  validate("createMaterial"),
  materialController.create
);
app.delete(
  "/api/v1/materials/:id",
  requireAuth,
  validateParams("idParam"),
  materialController.remove
);
app.post(
  "/api/v1/materials/:id/audit",
  requireAuth,
  validateParams("idParam"),
  materialController.audit
);

// ── 上传路由 ────────────────────────────────────────────────
app.post(
  "/api/v1/upload/credential",
  requireAuth,
  validate("uploadCredential"),
  uploadController.getUploadCredential
);
app.post(
  "/api/v1/upload/confirm",
  requireAuth,
  validate("confirmUpload"),
  uploadController.confirmUpload
);

// ── Prompt 团队路由 ─────────────────────────────────────────
app.post(
  "/api/v1/prompt-teams",
  requireAuth,
  validate("createTeam"),
  promptTeamController.createTeam
);
app.get("/api/v1/prompt-teams", requireAuth, promptTeamController.listMyTeams);
app.post(
  "/api/v1/prompt-teams/members",
  requireAuth,
  validate("addTeamMember"),
  promptTeamController.addTeamMember
);
app.post(
  "/api/v1/prompts/with-version",
  requireAuth,
  validate("savePromptWithVersion"),
  promptTeamController.saveTemplateWithVersion
);
app.get(
  "/api/v1/prompts/:template_id/versions",
  requireAuth,
  validateParams("templateIdParam"),
  promptTeamController.listTemplateVersions
);
app.post(
  "/api/v1/prompts/:template_id/versions/:version_id/restore",
  requireAuth,
  validateParams("templateIdParam"),
  promptTeamController.restoreTemplateVersion
);

// ── 审核标注路由 ────────────────────────────────────────────
app.post(
  "/api/v1/audit/annotations",
  requireAuth,
  validate("createAuditAnnotation"),
  auditAnnotationController.createAnnotation
);
app.get(
  "/api/v1/audit/annotations",
  requireAuth,
  auditAnnotationController.listAnnotations
);
app.delete(
  "/api/v1/audit/annotations/:id",
  requireAuth,
  validateParams("idParam"),
  auditAnnotationController.deleteAnnotation
);
app.post(
  "/api/v1/audit/seed-samples",
  requireAuth,
  auditAnnotationController.seedSamples
);
app.post(
  "/api/v1/audit/evaluation/report",
  requireAuth,
  auditAnnotationController.generateEvaluationReport
);
app.get(
  "/api/v1/audit/evaluation/reports",
  requireAuth,
  auditAnnotationController.listEvaluationReports
);
app.get(
  "/api/v1/audit/evaluation/reports/:id",
  requireAuth,
  validateParams("idParam"),
  auditAnnotationController.getReportDetail
);

// ── 用户路由 ────────────────────────────────────────────────
app.get("/api/v1/users/me", requireAuth, userController.profile);
app.put(
  "/api/v1/users/me",
  requireAuth,
  validate("updateProfile"),
  userController.updateProfile
);
app.get("/api/v1/users/me/articles", requireAuth, userController.myArticles);
app.post(
  "/api/v1/users/me/password",
  requireAuth,
  validate("changePassword"),
  userController.changePassword
);
app.get(
  "/api/v1/users/me/feedback/:type",
  requireAuth,
  userController.myFeedbackArticles
);

// ── 文章路由 ────────────────────────────────────────────────
app.post(
  "/api/v1/articles/draft",
  requireAuth,
  validate("upsertDraft"),
  articleController.upsertDraft
);
app.post(
  "/api/v1/articles/drafts/sync",
  requireAuth,
  validate("syncDrafts"),
  articleController.syncDrafts
);
app.get(
  "/api/v1/articles/latest-draft",
  requireAuth,
  articleController.latestDraft
);
app.get(
  "/api/v1/articles/:id/versions",
  requireAuth,
  validateParams("idParam"),
  articleController.versions
);
app.post(
  "/api/v1/articles/:id/versions/:versionId/restore",
  requireAuth,
  validateParams("idParam"),
  articleController.restoreVersion
);
app.post(
  "/api/v1/articles/:id/withdraw",
  requireAuth,
  validateParams("idParam"),
  articleController.withdraw
);
app.post(
  "/api/v1/articles/:id/feedback",
  requireAuth,
  validateParams("idParam"),
  validate("articleFeedback"),
  articleController.feedback
);
app.get("/api/v1/articles/search", articleController.searchArticles);
app.get("/api/v1/articles/:id", articleController.detail);

// ── 热榜路由 ────────────────────────────────────────────────
app.get(
  "/api/v1/rank/hot",
  validateQuery("cursorQuery"),
  rankingController.hot
);

// ── 分发路由 ────────────────────────────────────────────────
app.post(
  "/api/v1/distribution/sync",
  requireAuth,
  validate("distributionSync"),
  distributionController.sync
);

// ── 生成历史路由 ────────────────────────────────────────────
app.get(
  "/api/v1/ai/generation-history",
  requireAuth,
  aiController.listGenerationHistory
);
app.delete(
  "/api/v1/ai/generation-history/:id",
  requireAuth,
  aiController.deleteGenerationHistory
);

// ── 管理后台路由 ────────────────────────────────────────────

// Dashboard (staff+)
app.get(
  "/api/v1/admin/dashboard/overview",
  requireAuth, requireStaff,
  adminDashboardController.getPlatformOverview
);
app.get(
  "/api/v1/admin/dashboard/trends",
  requireAuth, requireStaff,
  adminDashboardController.getTrendData
);

// User management (admin only)
app.get(
  "/api/v1/admin/users/stats",
  requireAuth, requireAdmin,
  adminUserController.getUserStats
);
app.get(
  "/api/v1/admin/users",
  requireAuth, requireAdmin,
  validateQuery("adminListUsers"),
  adminUserController.listUsers
);
app.get(
  "/api/v1/admin/users/:id",
  requireAuth, requireAdmin,
  validateParams("idParam"),
  adminUserController.getUser
);
app.put(
  "/api/v1/admin/users/:id",
  requireAuth, requireAdmin,
  validateParams("idParam"),
  validate("adminUpdateUser"),
  adminUserController.updateUser
);
app.delete(
  "/api/v1/admin/users/:id",
  requireAuth, requireAdmin,
  validateParams("idParam"),
  adminUserController.deleteUser
);
app.get(
  "/api/v1/admin/users/:id/articles",
  requireAuth, requireAdmin,
  validateParams("idParam"),
  adminUserController.getUserArticles
);

// Article management (staff+)
app.get(
  "/api/v1/admin/articles/stats",
  requireAuth, requireStaff,
  adminArticleController.getArticleStats
);
app.get(
  "/api/v1/admin/articles",
  requireAuth, requireStaff,
  validateQuery("adminListArticles"),
  adminArticleController.listArticles
);
app.get(
  "/api/v1/admin/articles/:id",
  requireAuth, requireStaff,
  validateParams("idParam"),
  adminArticleController.getArticle
);
app.post(
  "/api/v1/admin/articles/:id/review",
  requireAuth, requireStaff,
  validateParams("idParam"),
  validate("adminReviewArticle"),
  adminArticleController.reviewArticle
);
app.post(
  "/api/v1/admin/articles/:id/withdraw",
  requireAuth, requireStaff,
  validateParams("idParam"),
  adminArticleController.forceWithdraw
);
app.delete(
  "/api/v1/admin/articles/:id",
  requireAuth, requireAdmin,
  validateParams("idParam"),
  adminArticleController.forceDelete
);
app.get(
  "/api/v1/admin/articles/:id/analytics",
  requireAuth, requireStaff,
  validateParams("idParam"),
  adminArticleController.getArticleAnalytics
);

// Prompt management (staff+)
app.get(
  "/api/v1/admin/prompts",
  requireAuth, requireStaff,
  adminPromptController.listAllPrompts
);
app.post(
  "/api/v1/admin/prompts",
  requireAuth, requireStaff,
  validate("createPrompt"),
  adminPromptController.createSystemPrompt
);
app.put(
  "/api/v1/admin/prompts/:id",
  requireAuth, requireStaff,
  validateParams("idParam"),
  validate("updatePrompt"),
  adminPromptController.updateAnyPrompt
);
app.delete(
  "/api/v1/admin/prompts/:id",
  requireAuth, requireStaff,
  validateParams("idParam"),
  adminPromptController.deleteAnyPrompt
);

// Material management (staff+)
app.get(
  "/api/v1/admin/materials",
  requireAuth, requireStaff,
  validateQuery("adminListMaterials"),
  adminMaterialController.listAllMaterials
);
app.post(
  "/api/v1/admin/materials/:id/risk-override",
  requireAuth, requireStaff,
  validateParams("idParam"),
  validate("adminOverrideMaterialRisk"),
  adminMaterialController.overrideRisk
);

// Audit management (staff+)
app.get(
  "/api/v1/admin/audit/annotations",
  requireAuth, requireStaff,
  adminAuditController.listAllAnnotations
);
app.get(
  "/api/v1/admin/audit/reports",
  requireAuth, requireStaff,
  adminAuditController.listAllReports
);
app.delete(
  "/api/v1/admin/audit/reports/:id",
  requireAuth, requireStaff,
  validateParams("idParam"),
  adminAuditController.deleteReport
);

// System config (admin only)
app.get(
  "/api/v1/admin/system/ranking-weights",
  requireAuth, requireAdmin,
  adminSystemController.getRankingWeights
);
app.put(
  "/api/v1/admin/system/ranking-weights",
  requireAuth, requireAdmin,
  validate("adminUpdateRankingWeights"),
  adminSystemController.updateRankingWeights
);
app.get(
  "/api/v1/admin/system/ai-config",
  requireAuth, requireAdmin,
  adminSystemController.getAIConfig
);
app.put(
  "/api/v1/admin/system/ai-config",
  requireAuth, requireAdmin,
  validate("adminUpdateAIConfig"),
  adminSystemController.updateAIConfig
);
app.get(
  "/api/v1/admin/system/rate-limit",
  requireAuth, requireAdmin,
  adminSystemController.getRateLimitConfig
);
app.put(
  "/api/v1/admin/system/rate-limit",
  requireAuth, requireAdmin,
  validate("adminUpdateRateLimit"),
  adminSystemController.updateRateLimitConfig
);
app.get(
  "/api/v1/admin/system/audit-categories",
  requireAuth, requireAdmin,
  adminSystemController.getAuditCategories
);
app.put(
  "/api/v1/admin/system/audit-categories",
  requireAuth, requireAdmin,
  validate("adminUpdateAuditCategories"),
  adminSystemController.updateAuditCategories
);

// ── 错误处理 ────────────────────────────────────────────────
app.use(errorHandler);

// ── 优雅关闭 ────────────────────────────────────────────────
let server = null;
const connections = new Set();

// Track connections for graceful shutdown
app.use((req, res, next) => {
  connections.add(res);
  res.on("close", () => connections.delete(res));
  res.on("finish", () => connections.delete(res));
  next();
});

async function gracefulShutdown(signal) {
  logger.info(`收到 ${signal} 信号，开始优雅关闭...`);

  // 停止接收新连接
  if (server) {
    server.close(() => {
      logger.info("HTTP server closed");
    });
  }

  // 给现有请求最多 25 秒完成
  const shutdownTimeout = setTimeout(() => {
    logger.warn(
      `仍有 ${connections.size} 个连接未完成，强制关闭`
    );
    process.exit(0);
  }, 25_000);

  // 允许事件循环清空
  shutdownTimeout.unref();

  try {
    // 关闭 Redis 连接
    try {
      const redis = require("./config/redis");
      await redis.quit();
      logger.info("Redis connection closed");
    } catch (err) {
      logger.warn("Redis close error: " + err.message);
    }

    // 关闭 Sequelize 连接池
    try {
      const { sequelize } = require("./models");
      await sequelize.close();
      logger.info("Database connection closed");
    } catch (err) {
      logger.warn("Database close error: " + err.message);
    }
  } catch {
    // ignore
  }

  clearTimeout(shutdownTimeout);
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error("未捕获的 Promise rejection", { reason: String(reason) });
});
process.on("uncaughtException", (error) => {
  logger.error("未捕获的异常", { message: error.message, stack: error.stack });
  process.exit(1);
});

// ── 启动 ────────────────────────────────────────────────────
async function bootstrap() {
  await syncModels();
  server = app.listen(port, () => {
    logger.info(`AI Creator backend 已启动`, {
      port,
      env: isProduction ? "production" : "development",
      node: process.version,
    });
  });
}

bootstrap().catch((error) => {
  logger.error("启动失败", { message: error.message, stack: error.stack });
  process.exit(1);
});

module.exports = app;
