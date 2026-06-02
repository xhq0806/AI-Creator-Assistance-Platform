const { AuditLog, GenerationHistory } = require("../models");
const aiService = require("../services/ai.service");
const { ok } = require("../utils/apiResponse");

const MAX_HISTORY_PER_USER = 20;

async function generate(req, res, next) {
  try {
    const result = await aiService.generateContent(req.body);
    if (req.user && req.body.prompt) {
      await GenerationHistory.create({
        user_id: req.user.id,
        prompt: req.body.prompt,
        mode: req.body.mode || "full_generation",
        result: {
          title: result.title,
          content: result.content,
          suggested_tags: result.suggested_tags,
          media_urls: req.body.materials || [],
        },
      });
      const count = await GenerationHistory.count({
        where: { user_id: req.user.id },
      });
      if (count > MAX_HISTORY_PER_USER) {
        const excessRecords = await GenerationHistory.findAll({
          where: { user_id: req.user.id },
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

async function generateImage(req, res, next) {
  try {
    const result = await aiService.generateImage(req.body);
    return ok(res, result);
  } catch (error) {
    return next(error);
  }
}

async function generateVideo(req, res, next) {
  try {
    const result = await aiService.generateVideo(req.body);
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
