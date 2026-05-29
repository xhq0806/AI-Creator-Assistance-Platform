const { AuditLog } = require('../models');
const aiService = require('../services/ai.service');
const { ok } = require('../utils/apiResponse');

async function generate(req, res, next) {
  try {
    const result = await aiService.generateContent(req.body);
    return ok(res, result);
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
      risk_category: result.risk_category || '',
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
};
