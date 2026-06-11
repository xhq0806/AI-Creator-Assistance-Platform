const redis = require("../config/redis");
const { Op } = require("sequelize");
const { Article, User } = require("../models");
const { calculateHotScore } = require("./ranking-formula");

const HOT_RANK_KEY = "rank:hot_articles";

async function cacheArticle(article) {
  const payload = article.toJSON ? article.toJSON() : article;
  await redis.set(`article:${payload.id}`, JSON.stringify(payload), "EX", 600);
}

async function removeArticleFromRank(articleId) {
  const id = String(articleId);
  await Promise.all([
    redis.zrem(HOT_RANK_KEY, id),
    redis.del(`article:${id}`),
  ]);
}

async function refreshArticleRank(article) {
  if (article.status !== "published") {
    await removeArticleFromRank(article.id);
    return 0;
  }

  const score = calculateHotScore(article);
  await Promise.all([
    redis.zadd(HOT_RANK_KEY, score, String(article.id)),
    cacheArticle(article),
  ]);
  return score;
}

async function getHotArticles({
  cursor = "+inf",
  limit = 10,
  category = null,
  timeRange = null,
} = {}) {
  let whereBase = { status: "published" };
  let useCategory = false;

  try {
    if (category) {
      whereBase.category = category;
      useCategory = true;
    }
  } catch {
    // category 字段可能不存在，降级处理
    whereBase = { status: "published" };
    useCategory = false;
  }

  if (timeRange) {
    const ranges = { today: 24, week: 168, month: 720 };
    const hours = ranges[timeRange];
    if (hours) {
      whereBase.created_at = { [Op.gte]: new Date(Date.now() - hours * 36e5) };
    }
  }

  if (useCategory || timeRange) {
    let articles;
    try {
      articles = await Article.findAll({
        where: whereBase,
        include: [{ model: User, attributes: ["id", "username"] }],
        order: [
          ["ai_rank_score", "DESC"],
          ["quality_score", "DESC"],
          ["created_at", "DESC"],
          ["id", "DESC"],
        ],
        limit,
      });
    } catch {
      // 查询失败（可能是 category 字段不存在），降级为全量查询
      articles = await Article.findAll({
        where: { status: "published" },
        include: [{ model: User, attributes: ["id", "username"] }],
        order: [
          ["ai_rank_score", "DESC"],
          ["quality_score", "DESC"],
          ["created_at", "DESC"],
          ["id", "DESC"],
        ],
        limit,
      });
    }
    const list = articles.map((article) => {
      const payload = article.toJSON();
      const mediaUrls = payload.media_urls || [];
      return {
        ...payload,
        id: Number(payload.id),
        user_id: Number(payload.user_id),
        quality_score: Number(payload.quality_score || 0),
        ai_rank_score: Number(payload.ai_rank_score || 0),
        ai_rank_reason: payload.ai_rank_reason || "",
        ai_rank_tags: payload.ai_rank_tags || [],
        cover_url: Array.isArray(mediaUrls) ? mediaUrls[0] : undefined,
        author: payload.User
          ? { id: Number(payload.User.id), username: payload.User.username }
          : undefined,
        score: calculateHotScore(article),
        category: payload.category || "通用",
      };
    });
    return { list, nextCursor: undefined };
  }

  const rows = await redis.zrevrangebyscore(
    HOT_RANK_KEY,
    cursor,
    "-inf",
    "WITHSCORES",
    "LIMIT",
    0,
    limit
  );
  const pairs = [];
  for (let index = 0; index < rows.length; index += 2) {
    pairs.push({ id: rows[index], score: Number(rows[index + 1]) });
  }

  if (!pairs.length) {
    let fallbackArticles;
    try {
      fallbackArticles = await Article.findAll({
        where: { status: "published" },
        include: [{ model: User, attributes: ["id", "username"] }],
        order: [
          ["ai_rank_score", "DESC"],
          ["quality_score", "DESC"],
          ["created_at", "DESC"],
          ["id", "DESC"],
        ],
        limit,
      });
    } catch {
      // 如果查询失败（可能是某些字段不存在），安全地查询
      fallbackArticles = await Article.findAll({
        where: { status: "published" },
        include: [{ model: User, attributes: ["id", "username"] }],
        limit,
      });
    }
    const list = fallbackArticles.map((article) => {
      const payload = article.toJSON();
      const mediaUrls = payload.media_urls || [];
      return {
        ...payload,
        id: Number(payload.id),
        user_id: Number(payload.user_id),
        quality_score: Number(payload.quality_score || 0),
        ai_rank_score: Number(payload.ai_rank_score || 0),
        ai_rank_reason: payload.ai_rank_reason || "",
        ai_rank_tags: payload.ai_rank_tags || [],
        cover_url: Array.isArray(mediaUrls) ? mediaUrls[0] : undefined,
        author: payload.User
          ? { id: Number(payload.User.id), username: payload.User.username }
          : undefined,
        score: calculateHotScore(article),
        category: payload.category || "通用",
      };
    });
    return { list, nextCursor: undefined };
  }

  const pairIds = pairs.map((item) => item.id);
  let liveArticles = [];
  try {
    liveArticles = pairIds.length
      ? await Article.findAll({
          where: { id: pairIds, status: "published" },
          include: [{ model: User, attributes: ["id", "username"] }],
        })
      : [];
  } catch {
    liveArticles = pairIds.length
      ? await Article.findAll({
          where: { id: pairIds, status: "published" },
          include: [{ model: User, attributes: ["id", "username"] }],
        })
      : [];
  }

  const liveMap = new Map(
    liveArticles.map((article) => [String(article.id), article])
  );
  const staleIds = pairIds.filter((id) => !liveMap.has(String(id)));
  if (staleIds.length) {
    void Promise.all(staleIds.map((id) => removeArticleFromRank(id))).catch(() => {});
  }

  const list = pairs
    .map((pair) => {
      const article = liveMap.get(String(pair.id));
      if (!article) {
        return undefined;
      }

      const payload = article.toJSON();
      const mediaUrls = payload.media_urls || [];
      return {
        ...payload,
        id: Number(payload.id),
        user_id: Number(payload.user_id),
        quality_score: Number(payload.quality_score || 0),
        ai_rank_score: Number(payload.ai_rank_score || 0),
        ai_rank_reason: payload.ai_rank_reason || "",
        ai_rank_tags: payload.ai_rank_tags || [],
        cover_url: Array.isArray(mediaUrls) ? mediaUrls[0] : undefined,
        author: payload.User
          ? { id: Number(payload.User.id), username: payload.User.username }
          : undefined,
        score: pair.score,
        category: payload.category || "通用",
      };
    })
    .filter(Boolean);

  return {
    list,
    nextCursor:
      pairs.length === limit
        ? String(pairs[pairs.length - 1].score)
        : undefined,
  };
}

module.exports = {
  HOT_RANK_KEY,
  calculateHotScore,
  removeArticleFromRank,
  refreshArticleRank,
  getHotArticles,
};
