const redis = require('../config/redis');
const { Article, User } = require('../models');

const HOT_RANK_KEY = 'rank:hot_articles';

function calculateHotScore(article) {
  const createdAt = new Date(article.created_at || article.createdAt).getTime();
  const ageInHours = Math.max(0, (Date.now() - createdAt) / 36e5);
  const qualityScore = Number(article.quality_score || 0);
  const viewCount = Number(article.view_count || 0);

  return qualityScore * 0.4 + Math.log(viewCount + 1) * 0.4 - ageInHours * 0.2;
}

async function cacheArticle(article) {
  const payload = article.toJSON ? article.toJSON() : article;
  await redis.set(`article:${payload.id}`, JSON.stringify(payload), 'EX', 600);
}

async function refreshArticleRank(article) {
  if (article.status !== 'published') {
    await redis.zrem(HOT_RANK_KEY, String(article.id));
    await cacheArticle(article);
    return 0;
  }

  const score = calculateHotScore(article);
  await Promise.all([redis.zadd(HOT_RANK_KEY, score, String(article.id)), cacheArticle(article)]);
  return score;
}

async function getHotArticles({ cursor = '+inf', limit = 10 }) {
  const rows = await redis.zrevrangebyscore(HOT_RANK_KEY, cursor, '-inf', 'WITHSCORES', 'LIMIT', 0, limit);
  const pairs = [];
  for (let index = 0; index < rows.length; index += 2) {
    pairs.push({ id: rows[index], score: Number(rows[index + 1]) });
  }

  if (!pairs.length) {
    const fallbackArticles = await Article.findAll({
      where: { status: 'published' },
      include: [{ model: User, attributes: ['id', 'username'] }],
      order: [['quality_score', 'DESC']],
      limit,
    });
    const list = fallbackArticles.map((article) => {
      const payload = article.toJSON();
      const mediaUrls = payload.media_urls || [];
      return {
        ...payload,
        id: Number(payload.id),
        user_id: Number(payload.user_id),
        quality_score: Number(payload.quality_score || 0),
        cover_url: Array.isArray(mediaUrls) ? mediaUrls[0] : undefined,
        author: payload.User ? { id: Number(payload.User.id), username: payload.User.username } : undefined,
        score: calculateHotScore(article),
      };
    });
    return { list, nextCursor: undefined };
  }

  const cacheKeys = pairs.map((item) => `article:${item.id}`);
  const cachedRows = await redis.mget(cacheKeys);
  const missingIds = pairs.filter((_, index) => !cachedRows[index]).map((item) => item.id);
  const missingArticles = missingIds.length
    ? await Article.findAll({
        where: { id: missingIds, status: 'published' },
        include: [{ model: User, attributes: ['id', 'username'] }],
      })
    : [];
  const missingMap = new Map(missingArticles.map((article) => [String(article.id), article.toJSON()]));

  const list = pairs
    .map((pair, index) => {
      const cached = cachedRows[index] ? JSON.parse(cachedRows[index]) : missingMap.get(String(pair.id));
      if (!cached || cached.status !== 'published') {
        return undefined;
      }

      const mediaUrls = cached.media_urls || [];
      return {
        ...cached,
        id: Number(cached.id),
        user_id: Number(cached.user_id),
        quality_score: Number(cached.quality_score || 0),
        cover_url: Array.isArray(mediaUrls) ? mediaUrls[0] : undefined,
        author: cached.User ? { id: Number(cached.User.id), username: cached.User.username } : cached.author,
        score: pair.score,
      };
    })
    .filter(Boolean);

  return {
    list,
    nextCursor: pairs.length === limit ? String(pairs[pairs.length - 1].score) : undefined,
  };
}

module.exports = {
  HOT_RANK_KEY,
  calculateHotScore,
  refreshArticleRank,
  getHotArticles,
};
