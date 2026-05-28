const { Article, User, ArticleVersion } = require('../models');
const { auditContent, evaluateQuality } = require('../services/ai.service');
const { createArticleVersion, serializeArticleVersion } = require('../services/article-version.service');
const { normalizeDraftForSync, isMeaningfulDraftPayload } = require('../services/draft-sync.service');
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
    like_count: Number(payload.like_count || 0),
    favorite_count: Number(payload.favorite_count || 0),
    negative_count: Number(payload.negative_count || 0),
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
    await createArticleVersion(savedArticle, status === 'published' ? 'publish' : 'draft_save');
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
    const results = [];

    for (const draft of drafts) {
      const payload = normalizeDraftForSync(draft, req.user.id);
      if (!isMeaningfulDraftPayload(payload)) {
        results.push({
          localId: draft.localId,
          skipped: true,
          reason: 'empty_draft',
        });
        continue;
      }

      const existedArticle = draft.id ? await Article.findOne({ where: { id: draft.id, user_id: req.user.id } }) : null;
      const savedArticle = existedArticle ? await existedArticle.update(payload) : await Article.create(payload);

      await createArticleVersion(savedArticle, 'offline_sync');
      await refreshArticleRank(savedArticle);
      results.push({
        localId: draft.localId,
        serverId: Number(savedArticle.id),
        action: existedArticle ? 'updated' : 'created',
      });
    }

    return ok(res, {
      synced: results.filter((item) => !item.skipped).length,
      results,
    });
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

async function versions(req, res, next) {
  try {
    const article = await Article.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id,
      },
    });
    if (!article) {
      return res.status(404).json({ code: 404, message: '文章不存在或无权查看版本' });
    }

    const list = await ArticleVersion.findAll({
      where: {
        article_id: article.id,
        user_id: req.user.id,
      },
      order: [['version_no', 'DESC']],
      limit: 30,
    });

    return ok(res, list.map(serializeArticleVersion));
  } catch (error) {
    return next(error);
  }
}

async function restoreVersion(req, res, next) {
  try {
    const article = await Article.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id,
      },
    });
    if (!article) {
      return res.status(404).json({ code: 404, message: '文章不存在或无权回滚' });
    }

    const version = await ArticleVersion.findOne({
      where: {
        id: req.params.versionId,
        article_id: article.id,
        user_id: req.user.id,
      },
    });
    if (!version) {
      return res.status(404).json({ code: 404, message: '版本不存在' });
    }

    const restoredArticle = await article.update({
      title: version.title,
      content: version.content,
      media_urls: version.media_urls || [],
      status: 'draft',
      quality_score: version.quality_score || 0,
    });

    await createArticleVersion(restoredArticle, 'restore');
    await refreshArticleRank(restoredArticle);

    return ok(res, serializeArticle(restoredArticle));
  } catch (error) {
    return next(error);
  }
}

async function withdraw(req, res, next) {
  try {
    const article = await Article.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id,
      },
    });
    if (!article) {
      return res.status(404).json({ code: 404, message: '文章不存在或无权撤回' });
    }

    const savedArticle = await article.update({ status: 'withdrawn' });
    await createArticleVersion(savedArticle, 'withdraw');
    await refreshArticleRank(savedArticle);

    return ok(res, serializeArticle(savedArticle));
  } catch (error) {
    return next(error);
  }
}

async function feedback(req, res, next) {
  try {
    const feedbackType = req.body.type;
    const fieldByType = {
      like: 'like_count',
      favorite: 'favorite_count',
      negative: 'negative_count',
    };
    const field = fieldByType[feedbackType];
    if (!field) {
      return res.status(400).json({ code: 400, message: '反馈类型不支持' });
    }

    const article = await Article.findByPk(req.params.id);
    if (!article || article.status !== 'published') {
      return res.status(404).json({ code: 404, message: '文章不存在或不可反馈' });
    }

    await article.increment(field, { by: 1 });
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
  versions,
  restoreVersion,
  withdraw,
  feedback,
  serializeArticle,
};
