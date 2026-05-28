# AI Creator Production and Distribution Platform

An AIGC workflow platform for creators. It covers account management, AI-assisted article generation, visual cover generation, prompt and material management, content safety review, quality scoring, auto-save, offline draft recovery, post-publish editing, version rollback, content withdrawal, ranked feeds, reader feedback, article consumption, and simulated distribution.

## Stack

- Frontend: React 18, TypeScript, Umi 4, Ant Design, localForage.
- Backend: Node.js, Express 5, Sequelize, JWT, bcryptjs.
- Data: MySQL for durable data, Redis for rate limiting, article cache, and hot ranking.
- AI: OpenAI-compatible SDK with ModelScope or Volcengine Ark. Local fallbacks keep the demo runnable when no API token is configured.

## Run Locally

```bash
pnpm install
pnpm --dir ai-creator-backend install
```

Create the MySQL database:

```sql
CREATE DATABASE IF NOT EXISTS ai_creator DEFAULT CHARACTER SET utf8mb4;
```

Copy `ai-creator-backend/.env.example` to `ai-creator-backend/.env`, then adjust MySQL, Redis, JWT, and AI provider settings.

Start the backend:

```bash
pnpm backend:dev
```

Start the frontend:

```bash
pnpm dev
```

Default local account:

```text
admin / admin123
```

## Verification

```bash
pnpm run typecheck
pnpm run build
pnpm run test
pnpm run smoke:e2e
```

## Documentation

- [Architecture](docs/architecture.md)
- [Safety and Quality Rules](docs/safety-quality-rules.md)
- [Evaluation Report](docs/evaluation-report.md)
- [Deployment and QA](docs/deployment-and-qa.md)
