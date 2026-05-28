# AI Creator Backend

Node.js REST API for the AI creator assistant platform.

## Scripts

- `pnpm dev`: start the API with nodemon.
- `pnpm start`: start the API with Node.js.

## Environment

Copy `.env.example` to `.env` and adjust database, Redis, JWT and Volcengine Ark settings.

## ModelScope AI Provider

The default AI provider is ModelScope through its OpenAI-compatible Chat Completions endpoint.

Set these variables in `.env`:

```env
AI_PROVIDER=modelscope
MODELSCOPE_API_TOKEN=ms-your-token
MODELSCOPE_BASE_URL=https://api-inference.modelscope.cn/v1
MODELSCOPE_TEXT_MODEL=Qwen/Qwen3-235B-A22B-Instruct-2507
```

The same text model is used for content generation, safety audit, compliant rewriting and quality scoring. If the token is empty, the service falls back to local mock results so the app remains runnable in development.
