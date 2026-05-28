const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { port } = require('./config/env');
const { syncModels } = require('./models');
const { requireAuth } = require('./middleware/auth');
const { aiRateLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const authController = require('./controllers/auth.controller');
const aiController = require('./controllers/ai.controller');
const articleController = require('./controllers/article.controller');
const rankingController = require('./controllers/ranking.controller');
const distributionController = require('./controllers/distribution.controller');
const promptController = require('./controllers/prompt.controller');
const materialController = require('./controllers/material.controller');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get('/api/v1/health', (req, res) => {
  res.json({ code: 200, data: { status: 'ok' } });
});

app.post('/api/v1/auth/login', authController.login);
app.post('/api/v1/auth/register', authController.register);
app.post('/api/v1/ai/generate', requireAuth, aiRateLimiter(10), aiController.generate);
app.post('/api/v1/ai/generate-image', requireAuth, aiRateLimiter(8), aiController.generateImage);
app.post('/api/v1/ai/audit', requireAuth, aiRateLimiter(20), aiController.audit);
app.post('/api/v1/ai/quality', requireAuth, aiRateLimiter(20), aiController.quality);
app.get('/api/v1/prompts', requireAuth, promptController.list);
app.post('/api/v1/prompts', requireAuth, promptController.create);
app.put('/api/v1/prompts/:id', requireAuth, promptController.update);
app.delete('/api/v1/prompts/:id', requireAuth, promptController.remove);
app.post('/api/v1/prompts/:id/use', requireAuth, promptController.markUsed);
app.get('/api/v1/materials', requireAuth, materialController.list);
app.post('/api/v1/materials', requireAuth, materialController.create);
app.delete('/api/v1/materials/:id', requireAuth, materialController.remove);
app.post('/api/v1/articles/draft', requireAuth, articleController.upsertDraft);
app.post('/api/v1/articles/drafts/sync', requireAuth, articleController.syncDrafts);
app.get('/api/v1/articles/latest-draft', requireAuth, articleController.latestDraft);
app.get('/api/v1/articles/:id/versions', requireAuth, articleController.versions);
app.post('/api/v1/articles/:id/versions/:versionId/restore', requireAuth, articleController.restoreVersion);
app.post('/api/v1/articles/:id/withdraw', requireAuth, articleController.withdraw);
app.post('/api/v1/articles/:id/feedback', articleController.feedback);
app.get('/api/v1/articles/:id', articleController.detail);
app.get('/api/v1/rank/hot', rankingController.hot);
app.post('/api/v1/distribution/sync', requireAuth, distributionController.sync);

app.use(errorHandler);

async function bootstrap() {
  await syncModels();
  app.listen(port, () => {
    console.log(`AI Creator backend listening on http://localhost:${port}`);
  });
}

if (require.main === module) {
  bootstrap().catch((error) => {
    console.error('[bootstrap] failed:', error);
    process.exit(1);
  });
}

module.exports = app;
