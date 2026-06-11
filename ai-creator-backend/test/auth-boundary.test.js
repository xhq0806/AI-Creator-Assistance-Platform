const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { jwtSecret, jwtRefreshSecret } = require('../src/config/env');

const backendRoot = path.resolve(__dirname, '..');
const authControllerPath = require.resolve('../src/controllers/auth.controller');
const authMiddlewarePath = require.resolve('../src/middleware/auth');
const articleControllerPath = require.resolve('../src/controllers/article.controller');
const modelsPath = require.resolve('../src/models');
const aiServicePath = require.resolve('../src/services/ai.service');
const articleVersionServicePath = require.resolve('../src/services/article-version.service');
const draftSyncServicePath = require.resolve('../src/services/draft-sync.service');
const rankingServicePath = require.resolve('../src/services/ranking.service');

function installMock(modulePath, exports) {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

function createRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function failNext(error) {
  throw error || new Error('next should not be called');
}

function loadAuthController(User) {
  delete require.cache[authControllerPath];
  installMock(modelsPath, { User });
  return require(authControllerPath);
}

function loadAuthMiddleware(User) {
  delete require.cache[authMiddlewarePath];
  installMock(modelsPath, { User });
  return require(authMiddlewarePath);
}

function loadArticleController({ Article, refreshArticleRank = async () => 0 } = {}) {
  delete require.cache[articleControllerPath];
  installMock(modelsPath, {
    Article,
    User: {},
    ArticleVersion: {},
    UserFeedback: {},
  });
  installMock(aiServicePath, {
    auditContent: async () => ({ is_compliant: true }),
    evaluateQuality: async () => ({ quality_score: 0 }),
    evaluateRankingPotential: async () => ({
      ai_rank_score: 0,
      ranking_reason: '',
      topic_tags: [],
    }),
  });
  installMock(articleVersionServicePath, {
    createArticleVersion: async () => undefined,
    serializeArticleVersion: (version) => version,
  });
  installMock(draftSyncServicePath, {
    normalizeDraftForSync: (draft) => draft,
    isMeaningfulDraftPayload: () => true,
  });
  installMock(rankingServicePath, {
    calculateHotScore: () => 0,
    refreshArticleRank,
  });
  return require(articleControllerPath);
}

function makeArticle(payload) {
  let incrementCalls = 0;
  let reloadCalls = 0;
  const state = { ...payload };
  return {
    get id() {
      return state.id;
    },
    get user_id() {
      return state.user_id;
    },
    get status() {
      return state.status;
    },
    get incrementCalls() {
      return incrementCalls;
    },
    get reloadCalls() {
      return reloadCalls;
    },
    async increment(field, { by }) {
      incrementCalls += 1;
      state[field] = Number(state[field] || 0) + by;
      return this;
    },
    async reload() {
      reloadCalls += 1;
      return this;
    },
    toJSON() {
      return { ...state };
    },
  };
}

test('refresh reloads role and status from the user record before issuing new tokens', async () => {
  let findOptions;
  const User = {
    async findByPk(id, options) {
      assert.equal(id, 42);
      findOptions = options;
      return {
        id: 42,
        username: 'writer',
        phone: null,
        email: null,
        role: 'editor',
        status: 'active',
      };
    },
  };
  const { refresh } = loadAuthController(User);
  const refreshToken = jwt.sign({ id: 42, username: 'writer', role: 'user' }, jwtRefreshSecret);
  const res = createRes();

  await refresh({ body: { refreshToken } }, res, failNext);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(findOptions.attributes, ['id', 'username', 'phone', 'email', 'role', 'status']);
  assert.equal(res.body.data.role, 'editor');
  assert.equal(res.body.data.status, 'active');
});

test('refresh rejects a valid refresh token for a disabled user', async () => {
  const User = {
    async findByPk() {
      return {
        id: 7,
        username: 'disabled-user',
        phone: null,
        email: null,
        role: 'user',
        status: 'disabled',
      };
    },
  };
  const { refresh } = loadAuthController(User);
  const refreshToken = jwt.sign({ id: 7, username: 'disabled-user', role: 'user' }, jwtRefreshSecret);
  const res = createRes();

  await refresh({ body: { refreshToken } }, res, failNext);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 403);
});

test('refresh returns unauthorized when the token is valid but the user no longer exists', async () => {
  const User = {
    async findByPk() {
      return null;
    },
  };
  const { refresh } = loadAuthController(User);
  const refreshToken = jwt.sign({ id: 99, username: 'deleted', role: 'user' }, jwtRefreshSecret);
  const res = createRes();

  await refresh({ body: { refreshToken } }, res, failNext);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, 401);
});

test('refresh returns service unavailable when the database user lookup fails', async () => {
  const User = {
    async findByPk() {
      throw new Error('database unavailable');
    },
  };
  const { refresh } = loadAuthController(User);
  const refreshToken = jwt.sign({ id: 10, username: 'cached-user', role: 'user' }, jwtRefreshSecret);
  const res = createRes();

  await refresh({ body: { refreshToken } }, res, failNext);

  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, 503);
  assert.equal(res.body.message, '认证服务暂不可用，请稍后重试');
});

test('register explicitly creates active users with the user role', async () => {
  let createPayload;
  const User = {
    async findOne() {
      return null;
    },
    async create(payload) {
      createPayload = payload;
      return {
        id: 3,
        username: payload.username,
        phone: payload.phone,
        email: payload.email,
        role: payload.role,
        status: payload.status,
      };
    },
  };
  const { register } = loadAuthController(User);
  const res = createRes();

  await register(
    { body: { username: 'new-user', password: 'StrongPass123', phone: '13800138000' } },
    res,
    failNext,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(createPayload.role, 'user');
  assert.equal(createPayload.status, 'active');
  assert.equal(res.body.data.role, 'user');
  assert.equal(res.body.data.status, 'active');
});

test('requireAuth returns service unavailable when the database role/status lookup fails', async () => {
  const User = {
    async findByPk() {
      throw new Error('database unavailable');
    },
  };
  const { requireAuth } = loadAuthMiddleware(User);
  const token = jwt.sign({ id: 1, username: 'cached-admin', role: 'admin' }, jwtSecret);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createRes();
  let nextCalled = false;

  await requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, 503);
});

test('optionalAuth continues as a guest when no bearer token is present', async () => {
  const User = {
    async findByPk() {
      throw new Error('database should not be queried');
    },
  };
  const { optionalAuth } = loadAuthMiddleware(User);
  const req = { headers: {} };
  const res = createRes();
  let nextCalled = false;

  await optionalAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user, undefined);
  assert.equal(res.statusCode, 200);
});

test('optionalAuth ignores invalid tokens and continues as a guest', async () => {
  const User = {
    async findByPk() {
      throw new Error('database should not be queried');
    },
  };
  const { optionalAuth } = loadAuthMiddleware(User);
  const req = { headers: { authorization: 'Bearer not-a-valid-token' } };
  const res = createRes();
  let nextCalled = false;

  await optionalAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user, undefined);
  assert.equal(res.statusCode, 200);
});

test('optionalAuth treats missing or disabled users as guests', async () => {
  const disabledUser = {
    async findByPk() {
      return { id: 5, role: 'admin', status: 'disabled' };
    },
  };
  const { optionalAuth } = loadAuthMiddleware(disabledUser);
  const token = jwt.sign({ id: 5, username: 'disabled-admin', role: 'admin' }, jwtSecret);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createRes();
  let nextCalled = false;

  await optionalAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user, undefined);
  assert.equal(res.statusCode, 200);
});

test('optionalAuth attaches active users with current database role and status', async () => {
  const User = {
    async findByPk() {
      return { id: 8, role: 'editor', status: 'active' };
    },
  };
  const { optionalAuth } = loadAuthMiddleware(User);
  const token = jwt.sign({ id: 8, username: 'stale-admin', role: 'admin' }, jwtSecret);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createRes();
  let nextCalled = false;

  await optionalAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user.role, 'editor');
  assert.equal(req.user.status, 'active');
});

test('article detail hides unpublished articles from guests without incrementing views', async () => {
  const article = makeArticle({
    id: 11,
    user_id: 2,
    title: 'Draft',
    content: 'Private draft',
    status: 'draft',
    media_urls: [],
    view_count: 0,
    User: { id: 2, username: 'author' },
  });
  const Article = {
    async findByPk() {
      return article;
    },
  };
  const { detail } = loadArticleController({ Article });
  const res = createRes();

  await detail({ params: { id: '11' } }, res, failNext);

  assert.equal(res.statusCode, 404);
  assert.equal(article.incrementCalls, 0);
});

test('article detail hides unpublished articles from non-staff users who are not the author', async () => {
  const article = makeArticle({
    id: 12,
    user_id: 2,
    title: 'Draft',
    content: 'Private draft',
    status: 'pending_review',
    media_urls: [],
    view_count: 0,
    User: { id: 2, username: 'author' },
  });
  const Article = {
    async findByPk() {
      return article;
    },
  };
  const { detail } = loadArticleController({ Article });
  const res = createRes();

  await detail({ params: { id: '12' }, user: { id: 9, role: 'user', status: 'active' } }, res, failNext);

  assert.equal(res.statusCode, 404);
  assert.equal(article.incrementCalls, 0);
});

test('article detail allows authors and staff to view unpublished articles', async () => {
  const article = makeArticle({
    id: 13,
    user_id: 2,
    title: 'Draft',
    content: 'Private draft',
    status: 'rejected',
    media_urls: [],
    view_count: 0,
    User: { id: 2, username: 'author' },
  });
  const Article = {
    async findByPk() {
      return article;
    },
  };
  const { detail } = loadArticleController({ Article });
  const authorRes = createRes();
  const staffRes = createRes();

  await detail({ params: { id: '13' }, user: { id: 2, role: 'user', status: 'active' } }, authorRes, failNext);
  await detail({ params: { id: '13' }, user: { id: 6, role: 'editor', status: 'active' } }, staffRes, failNext);

  assert.equal(authorRes.statusCode, 200);
  assert.equal(staffRes.statusCode, 200);
});

test('article detail keeps published articles publicly visible and refreshes ranking after view count changes', async () => {
  const article = makeArticle({
    id: 14,
    user_id: 2,
    title: 'Published',
    content: 'Public article',
    status: 'published',
    media_urls: [],
    view_count: 0,
    User: { id: 2, username: 'author' },
  });
  let refreshed = false;
  const Article = {
    async findByPk() {
      return article;
    },
  };
  const { detail } = loadArticleController({
    Article,
    refreshArticleRank: async () => {
      refreshed = true;
      return 0;
    },
  });
  const res = createRes();

  await detail({ params: { id: '14' } }, res, failNext);

  assert.equal(res.statusCode, 200);
  assert.equal(article.incrementCalls, 1);
  assert.equal(article.reloadCalls, 1);
  assert.equal(refreshed, true);
  assert.equal(res.body.data.view_count, 1);
});
