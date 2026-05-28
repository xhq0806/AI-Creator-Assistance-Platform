const { Article, User } = require('../models');
const { auditContent, evaluateQuality } = require('../services/ai.service');
const { calculateHotScore, refreshArticleRank } = require('../services/ranking.service');
const { ok } = require('../utils/apiResponse');

function serializeArticle(article) {
  const payload = article.toJSON ? article.toJSON() : article;
  const mediaUrls = payload.media_urls || [];
  return {
    ...payload,
    id: Number(payload.id),
    user_id: Number(payload.user_id),
    quality_score: Number(payload.quality_score || 0),
    cover_url: Array.isArray(mediaUrls) ? mediaUrls[0] : undefined,
    author: payload.User
      ? {
          id: Number(payload.User.id),
          username: payload.User.username,
        }
      : undefined,
    score: calculateHotScore(payload),
  };
}

async function upsertDraft(req, res, next) {
  try {
    const userId = req.user.id;
    const { id, title, content, media_urls = [], status = 'draft' } = req.body;
    let finalStatus = status;
    let auditResult;
    let qualityScore = 0;

    const [article] = id
      ? await Promise.all([Article.findOne({ where: { id, user_id: userId } })])
      : [undefined];

    if (status === 'published') {
      auditResult = await auditContent({ title, content });
      const quality = await evaluateQuality({ title, content });
      qualityScore = quality.quality_score;
      if (!auditResult.is_compliant) {
        finalStatus = 'rejected';
      }
    } else {
      qualityScore = Number(article?.quality_score || 0);
    }

    const payload = {
      user_id: userId,
      title,
      content,
      media_urls,
      status: finalStatus,
      quality_score: qualityScore,
    };

    const savedArticle = article ? await article.update(payload) : await Article.create(payload);
    await refreshArticleRank(savedArticle);

    if (auditResult && !auditResult.is_compliant) {
      return res.status(422).json({
        code: 422,
        message: '内容未通过安全审核，已自动驳回',
        data: {
          article: serializeArticle(savedArticle),
          audit: auditResult,
        },
      });
    }

    return ok(res, serializeArticle(savedArticle));
  } catch (error) {
    return next(error);
  }
}

async function syncDrafts(req, res, next) {
  try {
    const drafts = Array.isArray(req.body.drafts) ? req.body.drafts : [];
    let synced = 0;

    for (const draft of drafts) {
      const title = draft.title || '未命名草稿';
      const content = draft.content || '';
      if (!content.trim() && title === '未命名草稿' && !(draft.media_urls || []).length) {
        continue;
      }

      const savedArticle = await Article.create({
        user_id: req.user.id,
        title,
        content,
        media_urls: draft.media_urls || [],
        status: 'draft',
        quality_score: 0,
      });
      await refreshArticleRank(savedArticle);
      synced += 1;
    }

    return ok(res, { synced });
  } catch (error) {
    return next(error);
  }
}

async function latestDraft(req, res, next) {
  try {
    const article = await Article.findOne({
      where: { user_id: req.user.id, status: 'draft' },
      order: [['updated_at', 'DESC']],
    });

    return ok(res, article ? serializeArticle(article) : null);
  } catch (error) {
    return next(error);
  }
}

async function detail(req, res, next) {
  try {
    const article = await Article.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['id', 'username'] }],
    });
    if (!article) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }

    await article.increment('view_count', { by: 1 });
    await article.reload({ include: [{ model: User, attributes: ['id', 'username'] }] });
    await refreshArticleRank(article);

    return ok(res, serializeArticle(article));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  upsertDraft,
  syncDrafts,
  latestDraft,
  detail,
  serializeArticle,
};
