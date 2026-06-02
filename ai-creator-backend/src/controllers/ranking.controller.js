const { getHotArticles } = require("../services/ranking.service");
const { ok } = require("../utils/apiResponse");

async function hot(req, res, next) {
  try {
    const limit = Math.min(30, Number(req.query.limit || 10));
    const result = await getHotArticles({
      cursor: req.query.cursor || "+inf",
      limit,
      category: req.query.category || null,
      timeRange: req.query.time_range || null,
    });

    return ok(res, result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  hot,
};
