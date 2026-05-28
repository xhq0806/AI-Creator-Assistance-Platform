const { ArticleVersion } = require('../models');

async function createArticleVersion(article, source = 'draft_save') {
  const payload = article.toJSON ? article.toJSON() : article;
  const maxVersion = await ArticleVersion.max('version_no', {
    where: {
      article_id: payload.id,
    },
  });

  return ArticleVersion.create({
    article_id: payload.id,
    user_id: payload.user_id,
    version_no: Number(maxVersion || 0) + 1,
    title: payload.title,
    content: payload.content,
    media_urls: payload.media_urls || [],
    status: payload.status,
    quality_score: payload.quality_score || 0,
    source,
  });
}

function serializeArticleVersion(version) {
  const payload = version.toJSON ? version.toJSON() : version;
  return {
    ...payload,
    id: Number(payload.id),
    article_id: Number(payload.article_id),
    user_id: Number(payload.user_id),
    quality_score: Number(payload.quality_score || 0),
  };
}

module.exports = {
  createArticleVersion,
  serializeArticleVersion,
};
