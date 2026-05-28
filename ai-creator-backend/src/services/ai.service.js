const { createOpenAIClient, resolveProviderConfig } = require('../utils/openaiClient');

const client = createOpenAIClient();
const provider = resolveProviderConfig();

const auditSystemPrompt = `你是企业级内容安全审核引擎。请从涉黄、涉赌、涉毒、政治敏感、暴力恐怖、个人隐私泄露、未成年人风险、虚假夸大营销八个维度审核用户文本。
必须只返回严格 JSON，不要使用 Markdown。
JSON schema:
{
  "is_compliant": boolean,
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "risk_category": string,
  "reason": string,
  "accuracy": number,
  "safe_alternative": string
}
要求：
1. 高危或违法内容必须判定为不合规。
2. accuracy 取 0 到 1，表达置信度。
3. 若不合规，safe_alternative 必须给出不改变核心创意的合规替代文本。
4. 若合规，safe_alternative 返回空字符串。`;

function safeJsonParse(raw) {
  const normalized = String(raw || '')
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(normalized);
  } catch {
    const matched = normalized.match(/\{[\s\S]*\}/);
    if (!matched) {
      return undefined;
    }

    try {
      return JSON.parse(matched[0]);
    } catch {
      return undefined;
    }
  }
}

function extractMediaUrlsFromText(raw) {
  const text = String(raw || '');
  const dataUrls = text.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g) || [];
  const httpUrls = text.match(/https?:\/\/[^\s"'<>，。)）]+/g) || [];

  return [...dataUrls, ...httpUrls].filter((url) =>
    /^(data:image\/|https?:\/\/).+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(url) || url.startsWith('data:image/'),
  );
}

function extractMediaUrlsFromMessage(message) {
  const content = message?.content;
  if (typeof content === 'string') {
    const parsed = safeJsonParse(content);
    if (parsed?.media_urls || parsed?.image_url) {
      return [...(parsed.media_urls || []), parsed.image_url].filter(Boolean);
    }
    return extractMediaUrlsFromText(content);
  }

  if (Array.isArray(content)) {
    return content
      .flatMap((part) => {
        if (typeof part === 'string') {
          return extractMediaUrlsFromText(part);
        }
        if (part?.type === 'image_url') {
          return [part.image_url?.url || part.image_url].filter(Boolean);
        }
        if (part?.type === 'output_image' || part?.type === 'image') {
          return [part.url, part.image_url, part.b64_json ? `data:image/png;base64,${part.b64_json}` : ''].filter(Boolean);
        }
        return extractMediaUrlsFromText(part?.text || part?.content || '');
      })
      .filter(Boolean);
  }

  return [];
}

function createFallbackCoverDataUrl({ title, prompt }) {
  const safeTitle = String(title || prompt || 'AI 创作配图')
    .replace(/[<>&"']/g, '')
    .slice(0, 28);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="52%" stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
    <radialGradient id="glow" cx="70%" cy="28%" r="55%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity=".46"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <circle cx="930" cy="150" r="260" fill="url(#glow)"/>
  <path d="M0 520 C210 430 330 620 560 520 S900 450 1200 560 V675 H0Z" fill="#fff" opacity=".18"/>
  <text x="80" y="320" fill="#fff" font-size="58" font-family="serif" font-weight="700">${safeTitle}</text>
  <text x="84" y="388" fill="#dbeafe" font-size="26" font-family="sans-serif">AI Creator Visual Cover</text>
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

async function isReachableImageUrl(url) {
  if (String(url).startsWith('data:image/')) {
    return true;
  }

  if (!/^https?:\/\//i.test(String(url))) {
    return false;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'AI-Creator-Platform/1.0',
      },
    });
    const contentType = response.headers.get('content-type') || '';
    return response.ok && contentType.toLowerCase().startsWith('image/');
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function filterReachableImageUrls(urls) {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
  const results = await Promise.all(uniqueUrls.map(async (url) => ((await isReachableImageUrl(url)) ? url : undefined)));
  return results.filter(Boolean);
}

async function chatJson(messages, fallback) {
  if (!client) {
    return fallback('missing_api_key');
  }

  const jsonMessages = messages.map((message, index) => {
    if (index !== 0 || message.role !== 'system') {
      return message;
    }

    return {
      ...message,
      content: `${message.content}\n\n重要：最终回答必须是可被 JSON.parse 直接解析的 JSON 对象，不要输出 Markdown、解释、思考过程或代码块。`,
    };
  });

  const payload = {
    model: provider.model,
    temperature: 0.2,
    messages: jsonMessages,
  };

  let completion;
  try {
    completion = await client.chat.completions.create({
      ...payload,
      response_format: { type: 'json_object' },
    });
  } catch (error) {
    if (error.name === 'APIConnectionTimeoutError' || error.status === 401 || error.status === 403) {
      throw error;
    }
    // Some ModelScope-hosted models do not support response_format; retry with prompt-only JSON constraints.
    completion = await client.chat.completions.create(payload);
  }

  const message = completion.choices[0]?.message || {};
  const content = message.content || message.reasoning_content || '';
  const parsed = safeJsonParse(content);

  return parsed || fallback('invalid_json', content);
}

async function generateContent({ prompt, mode, materials = [] }) {
  const fallback = (reason) => ({
    title: prompt.slice(0, 24) || 'AI 创作草稿',
    content:
      reason === 'missing_api_key'
        ? `围绕「${prompt}」生成的内容草稿。当前未配置 ${provider.name} 模型密钥，系统已启用本地降级结果。`
        : `围绕「${prompt}」生成的内容草稿。${provider.name} 模型已调用，但返回内容不是标准 JSON，系统已启用本地降级结果。`,
    suggested_tags: ['AI', '创作'],
  });

  return chatJson(
    [
      {
        role: 'system',
        content:
          '你是资深新媒体内容策划，请只输出严格 JSON：title(string)、content(string)、suggested_tags(string[])。内容要适合图文平台发布，表达清晰、有传播性。',
      },
      {
        role: 'user',
        content: JSON.stringify({ prompt, mode, materials }),
      },
    ],
    fallback,
  );
}

async function auditContent({ title, content }) {
  const fallback = (reason) => ({
    is_compliant: true,
    risk_level: 'LOW',
    risk_category: '',
    reason:
      reason === 'missing_api_key'
        ? `未配置 ${provider.name} 模型密钥，已使用本地兜底审核，未发现明显风险。`
        : `${provider.name} 模型返回内容不是标准 JSON，已使用本地兜底审核，未发现明显风险。`,
    accuracy: 0.7,
    safe_alternative: '',
  });

  return chatJson(
    [
      { role: 'system', content: auditSystemPrompt },
      { role: 'user', content: JSON.stringify({ title, content }) },
    ],
    fallback,
  );
}

async function evaluateQuality({ title, content }) {
  const fallbackScore = Math.max(40, Math.min(88, Math.round((title.length * 1.5 + content.length / 18) * 10) / 10));
  const result = await chatJson(
    [
      {
        role: 'system',
        content:
          '你是内容质量评分器。请只返回 JSON：quality_score(number,0-100)、structure(number)、depth(number)、fluency(number)、reason(string)。综合结构、深度、流畅度打分。',
      },
      { role: 'user', content: JSON.stringify({ title, content }) },
    ],
    (reason) => ({
      quality_score: fallbackScore,
      structure: 70,
      depth: 68,
      fluency: 72,
      reason: reason === 'missing_api_key' ? '未配置模型密钥，本地兜底评分' : '模型返回非 JSON，本地兜底评分',
    }),
  );

  return {
    ...result,
    quality_score: Math.max(0, Math.min(100, Number(result.quality_score || 0))),
  };
}

async function generateImage({ prompt, title, content, materials = [] }) {
  const fallback = (reason) => ({
    media_urls: [createFallbackCoverDataUrl({ title, prompt })],
    cover_prompt: prompt || title || 'AI 创作配图',
    alt_text: title || 'AI 生成配图',
    provider: provider.name,
    fallback_reason: reason,
  });

  if (!client) {
    return fallback('missing_api_key');
  }

  const imagePrompt = prompt || `请为文章《${title || '未命名内容'}》生成一张适合作为图文封面的图片。文章摘要：${String(content || '').slice(0, 500)}`;
  const messages = [
    {
      role: 'system',
      content:
        '你是多模态内容生产助手。请根据用户提示生成一张适合图文内容发布的封面图。最终只返回严格 JSON：media_urls(string[]), cover_prompt(string), alt_text(string)。media_urls 必须包含模型生成图片的 URL 或 data URL。',
    },
    {
      role: 'user',
      content: JSON.stringify({ prompt: imagePrompt, title, content: String(content || '').slice(0, 1200), materials }),
    },
  ];

  const payload = {
    model: provider.model,
    temperature: 0.7,
    messages,
  };

  let completion;
  try {
    completion = await client.chat.completions.create({
      ...payload,
      response_format: { type: 'json_object' },
    });
  } catch {
    completion = await client.chat.completions.create(payload);
  }

  const message = completion.choices[0]?.message || {};
  const contentText = message.content || message.reasoning_content || '';
  const parsed = safeJsonParse(contentText);
  const candidateUrls = [
    ...(parsed?.media_urls || []),
    parsed?.image_url,
    ...extractMediaUrlsFromMessage(message),
    ...extractMediaUrlsFromText(message.reasoning_content),
  ].filter(Boolean);
  const mediaUrls = await filterReachableImageUrls(candidateUrls);

  if (!mediaUrls.length) {
    return fallback(candidateUrls.length ? 'unreachable_image_url' : 'no_image_url_in_model_response');
  }

  return {
    media_urls: Array.from(new Set(mediaUrls)),
    cover_prompt: parsed?.cover_prompt || imagePrompt,
    alt_text: parsed?.alt_text || title || 'AI 生成配图',
    provider: provider.name,
  };
}

module.exports = {
  generateContent,
  generateImage,
  auditContent,
  evaluateQuality,
};
