const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
const unique = Date.now();

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json();

  if (!response.ok || payload.code !== 200) {
    throw new Error(`${options.method || 'GET'} ${path} failed: ${payload.message || response.statusText}`);
  }

  return payload.data;
}

async function main() {
  await request('/api/v1/health');

  const user = await request('/api/v1/auth/register', {
    method: 'POST',
    body: {
      username: `smoke_${unique}`,
      email: `smoke_${unique}@example.com`,
      password: 'smoke123',
    },
  });

  const token = user.token;
  await request('/api/v1/prompts', {
    method: 'POST',
    token,
    body: {
      name: 'Smoke Prompt',
      category: '测试',
      content: '生成一篇关于 AI 创作效率的短图文。',
    },
  });

  await request('/api/v1/materials', {
    method: 'POST',
    token,
    body: {
      name: 'Smoke Cover',
      url: 'https://example.com/cover.jpg',
    },
  });

  const generated = await request('/api/v1/ai/generate', {
    method: 'POST',
    token,
    body: {
      prompt: '写一篇关于 AI 创作效率的短图文。',
      mode: 'full_generation',
      materials: [],
    },
  });

  const article = await request('/api/v1/articles/draft', {
    method: 'POST',
    token,
    body: {
      title: generated.title,
      content: generated.content,
      media_urls: [],
      status: 'published',
    },
  });

  await request(`/api/v1/articles/${article.id}`);
  await request(`/api/v1/articles/${article.id}/feedback`, {
    method: 'POST',
    body: { type: 'like' },
  });
  await request(`/api/v1/articles/${article.id}/versions`, {
    token,
  });
  await request('/api/v1/rank/hot');

  console.log(`Smoke E2E passed: article ${article.id}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
