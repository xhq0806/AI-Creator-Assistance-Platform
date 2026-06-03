// Lazy-load to avoid circular dependency
function getRedis() {
  try {
    return require('../config/redis');
  } catch {
    return null;
  }
}

const DEFAULT_WEIGHTS = {
  qualityScore: 0.35,
  aiRankScore: 0.25,
  viewLog: 0.35,
  feedbackLog: 0.3,
  negative: 0.35,
  age: 0.2,
};

let cachedWeights = null;
let cacheExpiry = 0;

async function loadWeightsFromRedis() {
  const redis = getRedis();
  if (!redis) return DEFAULT_WEIGHTS;

  try {
    const raw = await redis.get('config:system:ranking-weights');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_WEIGHTS, ...parsed };
    }
  } catch {
    // Fallback to defaults on any error
  }
  return DEFAULT_WEIGHTS;
}

async function getWeights() {
  const now = Date.now();
  if (cachedWeights && now < cacheExpiry) {
    return cachedWeights;
  }
  cachedWeights = await loadWeightsFromRedis();
  cacheExpiry = now + 30000; // 30s cache
  return cachedWeights;
}

function calculateHotScore(article, now = Date.now(), weights = null) {
  const createdAt = new Date(article.created_at || article.createdAt).getTime();
  const ageInHours = Math.max(0, (now - createdAt) / 36e5);
  const qualityScore = Number(article.quality_score || 0);
  const aiRankScore = Number(article.ai_rank_score || 0);
  const viewCount = Number(article.view_count || 0);
  const likeCount = Number(article.like_count || 0);
  const favoriteCount = Number(article.favorite_count || 0);
  const negativeCount = Number(article.negative_count || 0);
  const positiveFeedback = likeCount + favoriteCount * 2;

  const w = weights || DEFAULT_WEIGHTS;

  return (
    qualityScore * w.qualityScore +
    aiRankScore * w.aiRankScore +
    Math.log(viewCount + 1) * w.viewLog +
    Math.log(positiveFeedback + 1) * w.feedbackLog -
    negativeCount * w.negative -
    ageInHours * w.age
  );
}

module.exports = {
  calculateHotScore,
  getWeights,
  DEFAULT_WEIGHTS,
};

