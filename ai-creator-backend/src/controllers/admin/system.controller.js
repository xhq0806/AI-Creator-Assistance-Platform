const { ok } = require('../../utils/apiResponse');
const { getWeights, DEFAULT_WEIGHTS } = require('../../services/ranking-formula');

// Lazy-load redis to avoid crash if not available
function getRedis() {
  try { return require('../../config/redis'); } catch { return null; }
}

const REDIS_KEY_RANKING = 'config:system:ranking-weights';
const REDIS_KEY_AI = 'config:system:ai-config';
const REDIS_KEY_RATELIMIT = 'config:system:rate-limit';
const REDIS_KEY_AUDIT_CATEGORIES = 'config:system:audit-categories';

const DEFAULT_AI_CONFIG = {
  provider: 'ark',
  textModel: 'doubao-seed-2-0-lite-260428',
  imageModel: '',
  videoModel: '',
};

const DEFAULT_RATE_LIMIT = {
  globalWindowMs: 60000,
  globalMax: 120,
  aiGenerate: 10,
  aiGenerateImage: 8,
  aiGenerateVideo: 4,
  aiAudit: 20,
  aiQuality: 20,
};

const DEFAULT_AUDIT_CATEGORIES = [
  { key: 'PORN', label: '涉黄', enabled: true },
  { key: 'GAMBLING', label: '涉赌', enabled: true },
  { key: 'DRUG', label: '涉毒', enabled: true },
  { key: 'POLITICAL', label: '政治敏感', enabled: true },
  { key: 'VIOLENCE_TERROR', label: '暴力恐怖', enabled: true },
  { key: 'PRIVACY', label: '隐私泄露', enabled: true },
  { key: 'MINOR_RISK', label: '未成年风险', enabled: true },
  { key: 'FAKE_MARKETING', label: '虚假营销', enabled: true },
  { key: 'OTHER', label: '其他', enabled: true },
];

// ── Ranking Weights ──────────────────────────────────────────
async function getRankingWeights(req, res, next) {
  try {
    const weights = await getWeights();
    return ok(res, { weights, defaults: DEFAULT_WEIGHTS });
  } catch (error) {
    return next(error);
  }
}

async function updateRankingWeights(req, res, next) {
  try {
    const redis = getRedis();
    const nextWeights = { ...(await getWeights()), ...req.body };
    if (redis) {
      await redis.set(REDIS_KEY_RANKING, JSON.stringify(nextWeights));
    }
    return ok(res, { weights: nextWeights, message: '排名权重已更新（30 秒内生效）' });
  } catch (error) {
    return next(error);
  }
}

// ── AI Config ────────────────────────────────────────────────
async function getAIConfig(req, res, next) {
  try {
    const redis = getRedis();
    let config = { ...DEFAULT_AI_CONFIG };
    if (redis) {
      const raw = await redis.get(REDIS_KEY_AI);
      if (raw) config = { ...config, ...JSON.parse(raw) };
    }
    // Mask API key
    return ok(res, { ...config, apiKey: '••••••••' });
  } catch (error) {
    return next(error);
  }
}

async function updateAIConfig(req, res, next) {
  try {
    const redis = getRedis();
    if (!redis) {
      return res.status(503).json({ code: 503, message: 'Redis 不可用，无法保存配置' });
    }
    const existingRaw = await redis.get(REDIS_KEY_AI);
    const existing = existingRaw ? JSON.parse(existingRaw) : { ...DEFAULT_AI_CONFIG };
    const nextConfig = { ...existing, ...req.body };
    await redis.set(REDIS_KEY_AI, JSON.stringify(nextConfig));
    return ok(res, { message: 'AI 配置已更新' });
  } catch (error) {
    return next(error);
  }
}

// ── Rate Limit ───────────────────────────────────────────────
async function getRateLimitConfig(req, res, next) {
  try {
    const redis = getRedis();
    let config = { ...DEFAULT_RATE_LIMIT };
    if (redis) {
      const raw = await redis.get(REDIS_KEY_RATELIMIT);
      if (raw) config = { ...config, ...JSON.parse(raw) };
    }
    return ok(res, { config, defaults: DEFAULT_RATE_LIMIT });
  } catch (error) {
    return next(error);
  }
}

async function updateRateLimitConfig(req, res, next) {
  try {
    const redis = getRedis();
    if (!redis) {
      return res.status(503).json({ code: 503, message: 'Redis 不可用，无法保存配置' });
    }
    const existingRaw = await redis.get(REDIS_KEY_RATELIMIT);
    const existing = existingRaw ? JSON.parse(existingRaw) : { ...DEFAULT_RATE_LIMIT };
    const nextConfig = { ...existing, ...req.body };
    await redis.set(REDIS_KEY_RATELIMIT, JSON.stringify(nextConfig));
    return ok(res, { message: '限流配置已更新' });
  } catch (error) {
    return next(error);
  }
}

// ── Audit Categories ─────────────────────────────────────────
async function getAuditCategories(req, res, next) {
  try {
    const redis = getRedis();
    let categories = [...DEFAULT_AUDIT_CATEGORIES];
    if (redis) {
      const raw = await redis.get(REDIS_KEY_AUDIT_CATEGORIES);
      if (raw) categories = JSON.parse(raw);
    }
    return ok(res, { categories });
  } catch (error) {
    return next(error);
  }
}

async function updateAuditCategories(req, res, next) {
  try {
    const redis = getRedis();
    if (!redis) {
      return res.status(503).json({ code: 503, message: 'Redis 不可用，无法保存配置' });
    }
    await redis.set(REDIS_KEY_AUDIT_CATEGORIES, JSON.stringify(req.body.categories));
    return ok(res, { message: '审核分类配置已更新' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getRankingWeights,
  updateRankingWeights,
  getAIConfig,
  updateAIConfig,
  getRateLimitConfig,
  updateRateLimitConfig,
  getAuditCategories,
  updateAuditCategories,
};
