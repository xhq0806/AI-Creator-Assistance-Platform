const { Article } = require('../models');
const { syncToPlatforms } = require('../services/distribution.service');
const { ok } = require('../utils/apiResponse');

async function sync(req, res, next) {
  try {
    const { article_id, platforms = [] } = req.body;
    const article = await Article.findByPk(article_id);

    if (!article) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }

    const result = await syncToPlatforms(article, platforms);
    return ok(res, result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  sync,
};
