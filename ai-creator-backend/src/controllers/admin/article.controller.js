const { Op } = require('sequelize');
const { Article, User, AuditLog, ArticleVersion, UserFeedback } = require('../../models');
const { ok } = require('../../utils/apiResponse');
const { serializeArticle } = require('../article.controller');

async function getArticleStats(req, res, next) {
  try {
    const [byStatus, byCategory] = await Promise.all([
      Promise.all([
        Article.count({ where: { status: 'draft' } }),
        Article.count({ where: { status: 'pending_review' } }),
        Article.count({ where: { status: 'published' } }),
        Article.count({ where: { status: 'rejected' } }),
        Article.count({ where: { status: 'withdrawn' } }),
      ]).then(([draft, pending, published, rejected, withdrawn]) => ({
        draft, pending_review: pending, published, rejected, withdrawn,
      })),
      Article.findAll({
        attributes: ['category', [Article.sequelize.fn('COUNT', '*'), 'count']],
        group: ['category'],
        raw: true,
      }).then((rows) =>
        rows.reduce((acc, r) => ({ ...acc, [r.category || '通用']: Number(r.count) }), {})
      ),
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await Article.count({ where: { created_at: { [Op.gte]: todayStart } } });

    return ok(res, { byStatus, byCategory, todayCount });
  } catch (error) {
    return next(error);
  }
}

async function listArticles(req, res, next) {
  try {
    const {
      page = 1, pageSize = 20,
      status, category, userId, dateFrom, dateTo,
    } = req.query;
    const where = {};

    if (status) where.status = status;
    if (category) where.category = category;
    if (userId) where.user_id = Number(userId);
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at[Op.gte] = new Date(dateFrom);
      if (dateTo) where.created_at[Op.lte] = new Date(dateTo);
    }

    const offset = (Number(page) - 1) * Number(pageSize);
    const { rows, count } = await Article.findAndCountAll({
      where,
      include: [{ model: User, attributes: ['id', 'username'] }],
      order: [['created_at', 'DESC']],
      limit: Number(pageSize),
      offset,
    });

    return ok(res, {
      list: rows.map(serializeArticle),
      total: count,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    return next(error);
  }
}

async function getArticle(req, res, next) {
  try {
    const article = await Article.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['id', 'username'] }],
    });
    if (!article) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }

    return ok(res, serializeArticle(article));
  } catch (error) {
    return next(error);
  }
}

async function reviewArticle(req, res, next) {
  try {
    const article = await Article.findByPk(req.params.id);
    if (!article) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }

    const { action, reason = '' } = req.body;
    const newStatus = action === 'approve' ? 'published' : 'rejected';

    await article.update({ status: newStatus });

    // Log the review action
    await AuditLog.create({
      article_id: article.id,
      reviewer_id: req.user.id,
      action: `admin_${action}`,
      detail: reason || `管理员${action === 'approve' ? '通过' : '驳回'}审核`,
    });

    return ok(res, {
      ...serializeArticle(article),
      review_action: action,
      reason,
    });
  } catch (error) {
    return next(error);
  }
}

async function forceWithdraw(req, res, next) {
  try {
    const article = await Article.findByPk(req.params.id);
    if (!article) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }

    await article.update({ status: 'withdrawn' });

    await AuditLog.create({
      article_id: article.id,
      reviewer_id: req.user.id,
      action: 'admin_withdraw',
      detail: '管理员强制撤回',
    });

    return ok(res, serializeArticle(article));
  } catch (error) {
    return next(error);
  }
}

async function forceDelete(req, res, next) {
  try {
    const article = await Article.findByPk(req.params.id);
    if (!article) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }

    await Promise.all([
      ArticleVersion.destroy({ where: { article_id: article.id } }),
      UserFeedback.destroy({ where: { article_id: article.id } }),
      AuditLog.destroy({ where: { article_id: article.id } }),
    ]);

    await article.destroy();

    return ok(res, { message: '文章已删除' });
  } catch (error) {
    return next(error);
  }
}

async function getArticleAnalytics(req, res, next) {
  try {
    const article = await Article.findByPk(req.params.id, {
      attributes: ['id', 'title', 'status', 'view_count', 'like_count', 'favorite_count', 'negative_count', 'quality_score', 'ai_rank_score', 'ai_rank_reason', 'ai_rank_tags', 'created_at', 'updated_at'],
    });
    if (!article) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }

    const [versionCount, feedbackCount] = await Promise.all([
      ArticleVersion.count({ where: { article_id: article.id } }),
      UserFeedback.count({ where: { article_id: article.id } }),
    ]);

    return ok(res, {
      id: Number(article.id),
      title: article.title,
      status: article.status,
      views: Number(article.view_count || 0),
      likes: Number(article.like_count || 0),
      favorites: Number(article.favorite_count || 0),
      negatives: Number(article.negative_count || 0),
      quality_score: Number(article.quality_score || 0),
      ai_rank_score: Number(article.ai_rank_score || 0),
      ai_rank_reason: article.ai_rank_reason || '',
      ai_rank_tags: article.ai_rank_tags || [],
      versionCount,
      feedbackCount,
      created_at: article.created_at,
      updated_at: article.updated_at,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getArticleStats,
  listArticles,
  getArticle,
  reviewArticle,
  forceWithdraw,
  forceDelete,
  getArticleAnalytics,
};
