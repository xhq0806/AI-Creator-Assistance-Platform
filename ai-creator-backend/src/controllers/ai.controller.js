const { AuditLog, GenerationHistory } = require("../models");
const aiService = require("../services/ai.service");
const { ok } = require("../utils/apiResponse");

const MAX_HISTORY_PER_USER = 20;

async function saveHistory(user, prompt, mode, result) {
  if (!user || !prompt) return;

  await GenerationHistory.create({
    user_id: user.id,
    prompt,
    mode,
    result,
  });

  const count = await GenerationHistory.count({
    where: { user_id: user.id },
  });
  if (count > MAX_HISTORY_PER_USER) {
    const excessRecords = await GenerationHistory.findAll({
      where: { user_id: user.id },
      order: [["created_at", "DESC"]],
      offset: MAX_HISTORY_PER_USER,
      attributes: ["id"],
    });
    if (excessRecords.length > 0) {
      await GenerationHistory.destroy({
        where: {
          id: excessRecords.map((r) => r.id),
        },
      });
    }
  }
}

async function generate(req, res, next) {
  try {
    const result = await aiService.generateContent(req.body);
    await saveHistory(req.user, req.body.prompt, req.body.mode || "full_generation", {
      title: result.title,
      content: result.content,
      suggested_tags: result.suggested_tags,
      media_urls: req.body.materials || [],
    });
    return ok(res, result);
  } catch (error) {
    return next(error);
  }
}

async function listGenerationHistory(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return ok(res, []);
    const records = await GenerationHistory.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
      limit: MAX_HISTORY_PER_USER,
    });
    return ok(res, records);
  } catch (error) {
    return next(error);
  }
}

async function deleteGenerationHistory(req, res, next) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return ok(res, { deleted: false });
    await GenerationHistory.destroy({
      where: {
        id: Number(id),
        user_id: userId,
      },
    });
    return ok(res, { deleted: true });
  } catch (error) {
    return next(error);
  }
}

async function mergeMediaIntoRecentHistory(user, mediaUrls) {
  if (!user || !mediaUrls?.length) return;

  const recent = await GenerationHistory.findOne({
    where: { user_id: user.id },
    order: [["created_at", "DESC"]],
  });

  if (recent) {
    const existing = recent.result?.media_urls || [];
    const merged = [...new Set([...existing, ...mediaUrls])];
    await recent.update({
      result: { ...recent.result, media_urls: merged },
    });
  } else {
    await saveHistory(user, "素材生成", "full_generation", {
      title: "",
      content: "",
      media_urls: mediaUrls,
    });
  }
}

async function generateImage(req, res, next) {
  try {
    const result = await aiService.generateImage(req.body);
    await mergeMediaIntoRecentHistory(req.user, result.media_urls);
    return ok(res, result);
  } catch (error) {
    return next(error);
  }
}

async function generateVideo(req, res, next) {
  try {
    const result = await aiService.generateVideo(req.body);
    await mergeMediaIntoRecentHistory(req.user, result.media_urls);
    return ok(res, result);
  } catch (error) {
    return next(error);
  }
}

async function audit(req, res, next) {
  try {
    const result = await aiService.auditContent(req.body);
    await AuditLog.create({
      article_id: req.body.article_id || null,
      risk_category: result.risk_category || "",
      is_compliant: Boolean(result.is_compliant),
      raw_ai_response: JSON.stringify(result),
    });

    return ok(res, result);
  } catch (error) {
    return next(error);
  }
}

async function quality(req, res, next) {
  try {
    const result = await aiService.evaluateQuality(req.body);
    return ok(res, result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  generate,
  generateImage,
  generateVideo,
  audit,
  quality,
  listGenerationHistory,
  deleteGenerationHistory,
};
