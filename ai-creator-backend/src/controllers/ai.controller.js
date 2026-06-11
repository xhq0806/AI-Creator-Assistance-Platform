const { AuditLog, GenerationHistory } = require("../models");
const aiService = require("../services/ai.service");
const {
  MAX_HISTORY_PER_USER,
  saveGenerationHistory,
  mergeMediaIntoHistory,
} = require("../services/generation-history.service");
const { ok } = require("../utils/apiResponse");

async function generate(req, res, next) {
  try {
    const result = await aiService.generateContent(req.body);
    const historyRecord = await saveGenerationHistory(
      req.user,
      req.body.prompt,
      req.body.mode || "full_generation",
      {
        title: result.title,
        content: result.content,
        suggested_tags: result.suggested_tags,
        media_urls: [],
      }
    );
    return ok(res, {
      ...result,
      history_id: historyRecord ? Number(historyRecord.id) : undefined,
    });
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

async function generateImage(req, res, next) {
  try {
    const result = await aiService.generateImage(req.body);
    const historyId = await mergeMediaIntoHistory(
      req.user,
      result.media_urls,
      req.body.history_id
    );
    return ok(res, { ...result, history_id: historyId ?? undefined });
  } catch (error) {
    return next(error);
  }
}

async function refineImage(req, res, next) {
  try {
    const result = await aiService.refineImage(req.body);
    return ok(res, result);
  } catch (error) {
    return next(error);
  }
}

async function generateVideo(req, res, next) {
  try {
    const result = await aiService.generateVideo(req.body);
    const historyId = await mergeMediaIntoHistory(
      req.user,
      result.media_urls,
      req.body.history_id
    );
    return ok(res, { ...result, history_id: historyId ?? undefined });
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
  refineImage,
  generateVideo,
  audit,
  quality,
  listGenerationHistory,
  deleteGenerationHistory,
};
