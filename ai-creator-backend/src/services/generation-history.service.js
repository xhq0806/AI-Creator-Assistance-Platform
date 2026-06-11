const { Op } = require("sequelize");
const { GenerationHistory } = require("../models");

const MAX_HISTORY_PER_USER = 20;
const TEXT_GENERATION_MODES = ["full_generation", "structured", "rewrite", "outline"];

async function trimExcessHistory(userId) {
  const count = await GenerationHistory.count({ where: { user_id: userId } });
  if (count <= MAX_HISTORY_PER_USER) return;

  const excessRecords = await GenerationHistory.findAll({
    where: { user_id: userId },
    order: [["created_at", "DESC"]],
    offset: MAX_HISTORY_PER_USER,
    attributes: ["id"],
  });
  if (excessRecords.length > 0) {
    await GenerationHistory.destroy({
      where: { id: excessRecords.map((r) => r.id) },
    });
  }
}

async function saveGenerationHistory(user, prompt, mode, result) {
  if (!user || !prompt) return null;

  const record = await GenerationHistory.create({
    user_id: user.id,
    prompt,
    mode,
    result,
  });

  await trimExcessHistory(user.id);
  return record;
}

async function findHistoryTarget(user, historyId) {
  if (!user) return null;

  if (historyId) {
    const bound = await GenerationHistory.findOne({
      where: {
        id: historyId,
        user_id: user.id,
        mode: { [Op.in]: TEXT_GENERATION_MODES },
      },
    });
    if (bound) return bound;
  }

  return GenerationHistory.findOne({
    where: { user_id: user.id, mode: { [Op.in]: TEXT_GENERATION_MODES } },
    order: [["created_at", "DESC"]],
  });
}

async function mergeMediaIntoHistory(user, mediaUrls, historyId) {
  if (!user || !mediaUrls?.length) return;

  const target = await findHistoryTarget(user, historyId);

  if (target) {
    const existing = target.result?.media_urls || [];
    const merged = [...new Set([...existing, ...mediaUrls])];
    await target.update({
      result: { ...target.result, media_urls: merged },
    });
    return target.id;
  }

  const record = await saveGenerationHistory(user, "素材生成", "full_generation", {
    title: "",
    content: "",
    media_urls: mediaUrls,
  });
  return record?.id ?? null;
}

module.exports = {
  MAX_HISTORY_PER_USER,
  TEXT_GENERATION_MODES,
  saveGenerationHistory,
  mergeMediaIntoHistory,
};
