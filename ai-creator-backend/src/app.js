const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { port } = require("./config/env");
const { syncModels } = require("./models");
const { requireAuth } = require("./middleware/auth");
const { aiRateLimiter } = require("./middleware/rateLimiter");
const {
  validate,
  validateParams,
  validateQuery,
} = require("./middleware/validate");
const errorHandler = require("./middleware/errorHandler");
const requestLogger = require("./middleware/requestLogger");
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

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(requestLogger());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/api/v1/health", (req, res) => {
  res.json({ code: 200, data: { status: "ok", version: "1.0.0" } });
});

try {
  const swaggerUi = require("swagger-ui-express");
  const swaggerSpec = require("./swagger/config");
  app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api/v1/docs.json", (req, res) => res.json(swaggerSpec));
  console.log("[swagger] API docs available at http://localhost:" + port + "/api/v1/docs");
} catch {
  console.log("[swagger] swagger-ui-express not installed, skipping API docs");
}

app.post("/api/v1/auth/login", validate("login"), authController.login);
app.post(
  "/api/v1/auth/register",
  validate("register"),
  authController.register
);
app.post("/api/v1/auth/refresh", authController.refresh);

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

app.get(
  "/api/v1/rank/hot",
  validateQuery("cursorQuery"),
  rankingController.hot
);

app.post(
  "/api/v1/distribution/sync",
  requireAuth,
  validate("distributionSync"),
  distributionController.sync
);

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

app.use(errorHandler);

async function bootstrap() {
  await syncModels();
  app.listen(port, () => {
    console.log(`AI Creator backend listening on http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("[bootstrap] failed:", error);
  process.exit(1);
});

module.exports = app;
