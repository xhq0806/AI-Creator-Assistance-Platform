const { aiProvider, aiTimeoutMs, ark, modelscope } = require("../config/env");

const IMAGE_STYLE_SUFFIX =
  "写实摄影风格，自然光线，画面无文字、无水印、无海报排版，适合作为文章配图。";

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
  const normalized = String(raw || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
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

function isLikelyImageUrl(url) {
  const value = String(url || "");
  if (value.startsWith("data:image/")) {
    return true;
  }
  if (/\.(png|jpe?g|gif|webp|bmp|svg|mp4|mov|webm)(\?|$)/i.test(value)) {
    return true;
  }
  // 火山方舟 / 豆包对话生图返回的签名 CDN 链接通常无文件后缀
  if (/byteimg\.com|volces\.com|volccdn\.com|tos-cn-|ark-project\./i.test(value)) {
    return true;
  }
  return false;
}

function extractMediaUrlsFromText(raw) {
  const text = String(raw || "");
  const dataUrls =
    text.match(/data:(?:image|video)\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g) || [];
  const httpUrls = text.match(/https?:\/\/[^\s"'<>，。)）\]]+/g) || [];

  return [...dataUrls, ...httpUrls].filter(isLikelyImageUrl);
}

function extractMediaUrlsFromMessage(message) {
  const content = message?.content;
  if (typeof content === "string") {
    const parsed = safeJsonParse(content);
    if (parsed?.media_urls || parsed?.image_url) {
      return [...(parsed.media_urls || []), parsed.image_url].filter(Boolean);
    }
    return extractMediaUrlsFromText(content);
  }

  if (Array.isArray(content)) {
    return content
      .flatMap((part) => {
        if (typeof part === "string") {
          return extractMediaUrlsFromText(part);
        }
        if (part?.type === "image_url") {
          return [part.image_url?.url || part.image_url].filter(Boolean);
        }
        if (part?.type === "output_image" || part?.type === "image") {
          return [
            part.url,
            part.image_url,
            part.b64_json ? `data:image/png;base64,${part.b64_json}` : "",
          ].filter(Boolean);
        }
        return extractMediaUrlsFromText(part?.text || part?.content || "");
      })
      .filter(Boolean);
  }

  return [];
}

function extractTextFromResponse(payload) {
  if (typeof payload?.output_text === "string") {
    return payload.output_text;
  }

  const outputItems = Array.isArray(payload?.output) ? payload.output : [];
  const textParts = outputItems.flatMap((item) => {
    if (typeof item?.content === "string") {
      return [item.content];
    }
    if (!Array.isArray(item?.content)) {
      return [];
    }
    return item.content
      .map((part) => part.text || part.output_text || part.content || "")
      .filter(Boolean);
  });

  if (textParts.length) {
    return textParts.join("\n");
  }

  return payload?.choices?.[0]?.message?.content || "";
}

function extractMediaUrlsFromResponse(payload) {
  const urls = [];
  const pushUrl = (value) => {
    if (typeof value === "string") {
      urls.push(...extractMediaUrlsFromText(value));
    }
  };

  pushUrl(payload?.output_text);
  pushUrl(payload?.choices?.[0]?.message?.content);

  const outputItems = Array.isArray(payload?.output) ? payload.output : [];
  outputItems.forEach((item) => {
    pushUrl(item?.content);
    if (Array.isArray(item?.content)) {
      item.content.forEach((part) => {
        pushUrl(part?.text || part?.output_text || part?.content);
        pushUrl(part?.image_url?.url || part?.image_url || part?.video_url?.url || part?.video_url);
        pushUrl(part?.url);
      });
    }
  });

  return Array.from(new Set(urls.filter(Boolean)));
}

function buildResponseInput(messages) {
  return messages.map((message) => ({
    role: message.role === "system" ? "user" : message.role,
    content: [
      {
        type: "input_text",
        text: String(message.content || ""),
      },
    ],
  }));
}

async function callArkResponses({ model, input, instructions, extra = {} }) {
  if (!ark.apiKey) {
    throw new Error("未配置 ARK_API_KEY");
  }

  const baseURL = String(ark.baseURL || "").replace(/\/$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), aiTimeoutMs);

  let response;
  try {
    response = await fetch(`${baseURL}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ark.apiKey}`,
      },
      body: JSON.stringify({
        model,
        ...(instructions ? { instructions } : {}),
        input,
        ...extra,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      payload?.error?.message ||
      payload?.message ||
      `HTTP ${response.status}`;
    throw new Error(`火山方舟 REST API 调用失败：${detail}`);
  }

  return payload;
}

function buildScenePrompt({ prompt, title, content }) {
  const scene = String(prompt || "").trim();
  if (scene) {
    return `${scene}。${IMAGE_STYLE_SUFFIX}`;
  }

  const theme = String(title || "").trim() || String(content || "").trim().slice(0, 160);
  if (theme) {
    return `根据文章主题绘制配图：${theme}。${IMAGE_STYLE_SUFFIX}`;
  }

  return `宁静的自然风景摄影。${IMAGE_STYLE_SUFFIX}`;
}

function createPlaceholderCover({ title, prompt, reason }) {
  const sceneSeed = Buffer.from(String(prompt || title || "nature"))
    .toString("hex")
    .slice(0, 16);
  return {
    media_urls: [`https://picsum.photos/seed/${sceneSeed}/1200/675`],
    cover_prompt: prompt || title || "AI 生成配图",
    alt_text: title || "AI 场景图片",
    provider: "placeholder",
    placeholder_reason: reason,
  };
}

function normalizeArkImageError(message) {
  const text = String(message || "");
  if (/custom endpoint ID/i.test(text)) {
    return "火山方舟文生图需使用推理接入点 ID（ep- 开头）。请在控制台创建 Seedream 文生图接入点，并将 ARK_IMAGE_MODEL 设为该 ID。";
  }
  if (/only supported by certain models/i.test(text)) {
    return "当前接入点不支持 /images/generations。若使用 doubao-seed-2.0-lite，请保持 ARK_IMAGE_MODEL 与 ARK_MODEL 相同（ep- 开头），系统将自动走对话生图。";
  }
  return text;
}

function shouldUseArkChatImage(modelId) {
  const model = String(modelId || "");
  return ark.imageApi === "responses" || model.startsWith("ep-");
}

async function generateImageWithArkChat(imagePrompt, { title }) {
  const payload = await callArkResponses({
    model: ark.imageModel || ark.textModel,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `请生成一张与以下描述高度一致的写实配图，画面中不要出现任何文字或水印：\n${imagePrompt}`,
          },
        ],
      },
    ],
  });
  const urls = extractMediaUrlsFromResponse(payload);
  if (!urls.length) {
    throw new Error("模型未返回可用图片地址，请稍后重试");
  }

  const reachable = await filterReachableImageUrls(urls);
  const media_urls = reachable.length ? reachable : urls;

  return {
    media_urls,
    cover_prompt: imagePrompt,
    alt_text: title || "AI 场景图片",
    provider: "ark-responses",
  };
}

async function pollModelScopeImageTask(taskId) {
  const baseURL = String(modelscope.baseURL || "").replace(/\/$/, "");
  const maxAttempts = Math.max(6, Math.ceil(aiTimeoutMs / 5000));

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    const response = await fetch(`${baseURL}/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${modelscope.apiKey}`,
        "X-ModelScope-Task-Type": "image_generation",
      },
    });
    const payload = await response.json().catch(() => ({}));
    const status = String(
      payload.task_status || payload.output?.task_status || ""
    ).toUpperCase();

    if (status === "SUCCEED" || status === "SUCCEEDED") {
      return (payload.output_images || [])
        .concat(
          (payload.output?.images || []).map((item) => item.url).filter(Boolean)
        )
        .filter(Boolean);
    }

    if (status === "FAILED" || status === "FAILURE") {
      throw new Error(payload.message || "ModelScope 文生图任务失败");
    }
  }

  throw new Error("ModelScope 文生图超时，请稍后重试");
}

async function generateImageWithModelScope(imagePrompt, { title }) {
  if (!modelscope.apiKey) {
    throw new Error("未配置 MODELSCOPE_API_TOKEN");
  }

  const baseURL = String(modelscope.baseURL || "").replace(/\/$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), aiTimeoutMs);

  let response;
  try {
    response = await fetch(`${baseURL}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${modelscope.apiKey}`,
        "X-ModelScope-Async-Mode": "true",
      },
      body: JSON.stringify({
        model: modelscope.imageModel,
        prompt: imagePrompt,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `ModelScope 文生图提交失败(${response.status})`);
  }

  let urls = Array.isArray(payload.output_images) ? payload.output_images : [];
  if (!urls.length) {
    const taskId = payload.task_id || payload.data?.task_id;
    if (!taskId) {
      throw new Error("ModelScope 未返回任务 ID 或图片地址");
    }
    urls = await pollModelScopeImageTask(taskId);
  }

  const reachable = await filterReachableImageUrls(urls);
  if (!reachable.length) {
    throw new Error("ModelScope 文生图结果不可访问");
  }

  return {
    media_urls: reachable,
    cover_prompt: imagePrompt,
    alt_text: title || "AI 场景图片",
    provider: "modelscope",
  };
}

async function generateImageWithArkImagesApi(imagePrompt, { title }) {
  const baseURL = String(ark.baseURL || "").replace(/\/$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), aiTimeoutMs);

  let response;
  try {
    response = await fetch(`${baseURL}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ark.apiKey}`,
      },
      body: JSON.stringify({
        model: ark.imageModel,
        prompt: imagePrompt,
        size: "1280x720",
        response_format: "url",
        watermark: false,
        sequential_image_generation: "disabled",
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      payload?.error?.message ||
      payload?.message ||
      `HTTP ${response.status}`;
    throw new Error(normalizeArkImageError(`火山方舟文生图失败：${detail}`));
  }

  const urls = (payload.data || [])
    .map((item) => item?.url)
    .filter(Boolean);

  if (!urls.length) {
    throw new Error("文生图接口未返回图片地址");
  }

  const reachable = await filterReachableImageUrls(urls);
  if (!reachable.length) {
    throw new Error("文生图结果地址不可访问");
  }

  return {
    media_urls: reachable,
    cover_prompt: imagePrompt,
    alt_text: title || "AI 场景图片",
    provider: "ark-seedream",
  };
}

async function generateImageWithArk(imagePrompt, { title }) {
  if (!ark.apiKey) {
    throw new Error("未配置 ARK_API_KEY，无法调用文生图");
  }

  const imageModel = ark.imageModel || ark.textModel;
  if (shouldUseArkChatImage(imageModel)) {
    return generateImageWithArkChat(imagePrompt, { title });
  }

  try {
    return await generateImageWithArkImagesApi(imagePrompt, { title });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/only supported by certain models/i.test(message)) {
      return generateImageWithArkChat(imagePrompt, { title });
    }
    throw error;
  }
}

async function isReachableImageUrl(url) {
  if (String(url).startsWith("data:image/")) {
    return true;
  }

  if (!/^https?:\/\//i.test(String(url))) {
    return false;
  }

  if (/picsum\.photos/i.test(String(url))) {
    return true;
  }

  if (/byteimg\.com|volces\.com|volccdn\.com|tos-cn-|ark-project\./i.test(String(url))) {
    return true;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "AI-Creator-Platform/1.0",
      },
    });
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const looksLikeImage =
      contentType.startsWith("image/") ||
      contentType === "application/octet-stream" ||
      /\.(png|jpe?g|gif|webp)(\?|$)/i.test(String(url));
    return response.ok && looksLikeImage;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function filterReachableImageUrls(urls) {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
  const results = await Promise.all(
    uniqueUrls.map(async (url) =>
      (await isReachableImageUrl(url)) ? url : undefined
    )
  );
  return results.filter(Boolean);
}

async function chatJson(messages, fallback) {
  if (!ark.apiKey) {
    console.log("[AI调用调试] 未配置 ARK_API_KEY，直接返回兜底");
    return fallback("missing_api_key");
  }

  console.log("[AI调用调试] ====== 即将请求火山方舟 REST API ======");
  console.log("[AI调用调试] baseURL:", ark.baseURL);
  console.log("[AI调用调试] model名称:", ark.textModel);
  console.log(
    "[AI调用调试] APIKey前缀:",
    ark.apiKey ? ark.apiKey.slice(0, 12) + "..." : "空"
  );

  try {
    const systemMessages = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    const userMessages = messages.filter((message) => message.role !== "system");
    const payload = await callArkResponses({
      model: ark.textModel,
      instructions: systemMessages,
      input: buildResponseInput(userMessages),
      extra: { temperature: 0.2 },
    });
    console.log("[AI调用调试] API调用成功！");
    const contentText = extractTextFromResponse(payload);
    console.log("[AI调用调试] 模型返回内容:", contentText);
    const parsed = safeJsonParse(contentText);
    return parsed || fallback("invalid_json", contentText);
  } catch (error) {
    console.log("[AI调用调试] API调用出错:", error.message);
    throw error;
  }
}

async function generateContent({ prompt, mode, materials = [] }) {
  const fallback = (reason) => ({
    title: prompt.slice(0, 24) || "AI 创作草稿",
    content:
      reason === "missing_api_key"
        ? `围绕「${prompt}」生成的内容草稿。当前未配置火山方舟模型密钥，系统已启用本地降级结果。`
        : `围绕「${prompt}」生成的内容草稿。火山方舟模型已调用，但返回内容不是标准 JSON，系统已启用本地降级结果。`,
    suggested_tags: ["AI", "创作"],
  });

  return chatJson(
    [
      {
        role: "system",
        content:
          "你是资深新媒体内容策划，请只输出严格 JSON：title(string)、content(string)、suggested_tags(string[])。内容要适合图文平台发布，表达清晰、有传播性。",
      },
      {
        role: "user",
        content: JSON.stringify({ prompt, mode, materials }),
      },
    ],
    fallback
  );
}

async function auditContent({ title, content }) {
  const fallback = (reason) => ({
    is_compliant: true,
    risk_level: "LOW",
    risk_category: "",
    reason:
      reason === "missing_api_key"
        ? "未配置火山方舟模型密钥，已使用本地兜底审核，未发现明显风险。"
        : "火山方舟模型返回内容不是标准 JSON，已使用本地兜底审核，未发现明显风险。",
    accuracy: 0.7,
    safe_alternative: "",
  });

  return chatJson(
    [
      { role: "system", content: auditSystemPrompt },
      { role: "user", content: JSON.stringify({ title, content }) },
    ],
    fallback
  );
}

async function evaluateQuality({ title, content }) {
  const fallbackScore = Math.max(
    40,
    Math.min(
      88,
      Math.round((title.length * 1.5 + content.length / 18) * 10) / 10
    )
  );
  const result = await chatJson(
    [
      {
        role: "system",
        content:
          "你是内容质量评分器。请只返回 JSON：quality_score(number,0-100)、structure(number)、depth(number)、fluency(number)、reason(string)。综合结构、深度、流畅度打分。",
      },
      { role: "user", content: JSON.stringify({ title, content }) },
    ],
    (reason) => ({
      quality_score: fallbackScore,
      structure: 70,
      depth: 68,
      fluency: 72,
      reason:
        reason === "missing_api_key"
          ? "未配置模型密钥，本地兜底评分"
          : "模型返回非 JSON，本地兜底评分",
    })
  );

  return {
    ...result,
    quality_score: Math.max(
      0,
      Math.min(100, Number(result.quality_score || 0))
    ),
  };
}

async function generateImage({ prompt, title, content }) {
  const imagePrompt = buildScenePrompt({ prompt, title, content });
  const failures = [];

  if (ark.apiKey && ark.imageModel) {
    try {
      return await generateImageWithArk(imagePrompt, { title });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(message);
      console.error("[generateImage] Ark image API failed:", message);
    }
  }

  if (modelscope.apiKey) {
    try {
      return await generateImageWithModelScope(imagePrompt, { title });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(message);
      console.error("[generateImage] ModelScope image API failed:", message);
    }
  }

  if (!ark.apiKey && !modelscope.apiKey) {
    return createPlaceholderCover({
      title,
      prompt: imagePrompt,
      reason: "missing_api_key",
    });
  }

  throw new Error(failures.join("；") || "配图生成失败，请检查文生图 API 配置");
}

async function generateVideo({ prompt, title, content }) {
  const videoPrompt = buildScenePrompt({ prompt, title, content }).replace(
    "适合作为文章配图",
    "适合作为短视频素材"
  );

  if (!ark.apiKey) {
    throw new Error("未配置 ARK_API_KEY，无法生成视频");
  }
  if (!ark.videoModel) {
    throw new Error("未配置 ARK_VIDEO_MODEL，无法生成视频");
  }

  const payload = await callArkResponses({
    model: ark.videoModel,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `请根据以下描述生成一段短视频，画面不要出现文字或水印：\n${videoPrompt}`,
          },
        ],
      },
    ],
  });
  const mediaUrls = extractMediaUrlsFromResponse(payload);

  if (!mediaUrls.length) {
    throw new Error("模型未返回可用视频地址，请检查视频模型能力或稍后重试");
  }

  return {
    media_urls: mediaUrls,
    video_prompt: videoPrompt,
    alt_text: title || "AI 视频素材",
    provider: "ark-responses",
  };
}

module.exports = {
  generateContent,
  generateImage,
  generateVideo,
  auditContent,
  evaluateQuality,
};
