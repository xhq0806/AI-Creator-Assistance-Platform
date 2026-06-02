const allowedExtensions = {
  image: /\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?.*)?$/i,
  video: /\.(mp4|mov|webm|avi|mkv|flv)(\?.*)?$/i,
  audio: /\.(mp3|wav|aac|m4a|ogg|flac)(\?.*)?$/i,
};

const blockedExtensions = /\.(exe|dll|bat|sh|cmd|apk|zip|rar|7z|tar|gz)(\?.*)?$/i;

const riskyKeywordRules = [
  { category: "PORN", level: "HIGH", pattern: /(porn|sex|nude|naked|xxx|nsfw|adult|erotic|barely.?legal|cam.?girl|only.?fans|涉黄|色情|裸聊|约炮|成人|露点|福利)/i },
  { category: "GAMBLING", level: "HIGH", pattern: /(casino|gambling|poker|bet|betting|slot|wager|lottery.*win|博彩|赌博|赌场|下注|彩票.*中奖|稳赚)/i },
  { category: "DRUG", level: "HIGH", pattern: /(drug|cocaine|heroin|cannabis|methodone|marijuana|毒品|吸毒|大麻|冰毒|海洛因)/i },
  { category: "VIOLENCE_TERROR", level: "HIGH", pattern: /(violence|terror|kill|murder|bloody|gore|massacre|暴恐|恐怖|屠杀|血腥|暴力.?冲突)/i },
  { category: "PRIVACY", level: "MEDIUM", pattern: /(id_card|passport|身份证|护照|驾驶证|户口本)/i },
  { category: "FAKE_MARKETING", level: "MEDIUM", pattern: /(fake.*product|假货|仿冒|山寨.*正品)/i },
];

const mimeTypeMap = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/bmp": "image",
  "image/svg+xml": "image",
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/webm": "video",
  "video/x-msvideo": "video",
  "video/x-matroska": "video",
  "audio/mpeg": "audio",
  "audio/wav": "audio",
  "audio/aac": "audio",
  "audio/mp4": "audio",
  "audio/ogg": "audio",
  "audio/flac": "audio",
};

function inferMaterialType(url) {
  if (allowedExtensions.image.test(url)) return "image";
  if (allowedExtensions.video.test(url)) return "video";
  if (allowedExtensions.audio.test(url)) return "audio";
  return undefined;
}

function inferTypeFromMime(mimeType) {
  if (!mimeType) return undefined;
  return mimeTypeMap[mimeType.toLowerCase()] || inferMaterialType(`.${mimeType.split("/")[1]}`);
}

function assessMaterial({ name = "", url = "", mime_type, file_size }) {
  const normalizedUrl = String(url).trim();
  const normalizedName = String(name).trim();

  if (!normalizedUrl || !/^https?:\/\/.+/i.test(normalizedUrl)) {
    return {
      valid: false,
      reason: "素材必须是 http 或 https URL",
    };
  }

  if (normalizedUrl.length > 500) {
    return {
      valid: false,
      reason: "素材 URL 长度不能超过 500 个字符",
    };
  }

  if (blockedExtensions.test(normalizedName) || blockedExtensions.test(normalizedUrl)) {
    return {
      valid: false,
      reason: "不允许上传可执行文件或压缩包",
    };
  }

  const mediaType = mime_type
    ? inferTypeFromMime(mime_type)
    : inferMaterialType(normalizedUrl);

  if (!mediaType) {
    return {
      valid: false,
      reason: "仅支持图片、视频或音频素材（jpg/png/gif/webp/mp4/mov/webm/mp3/wav）",
    };
  }

  if (file_size !== undefined) {
    const maxSizes = { image: 10 * 1024 * 1024, video: 100 * 1024 * 1024, audio: 50 * 1024 * 1024 };
    if (file_size > (maxSizes[mediaType] || 10 * 1024 * 1024)) {
      return {
        valid: false,
        reason: `${mediaType === "image" ? "图片" : mediaType === "video" ? "视频" : "音频"}文件大小不能超过 ${Math.round(maxSizes[mediaType] / 1024 / 1024)}MB`,
      };
    }
  }

  const combinedText = `${normalizedName} ${normalizedUrl}`;
  for (const rule of riskyKeywordRules) {
    if (rule.pattern.test(combinedText)) {
      return {
        valid: false,
        mediaType,
        riskCategory: rule.category,
        riskLevel: rule.level,
        reason: `素材命中敏感词规则（类别：${rule.category}，等级：${rule.level}）`,
      };
    }
  }

  return {
    valid: true,
    mediaType,
    reason: "基础校验通过",
  };
}

function auditMaterialContent({ name, url, media_type, mime_type, file_size, file_key }) {
  const assessment = assessMaterial({ name, url, mime_type, file_size });

  if (!assessment.valid) {
    return {
      risk_status: "rejected",
      risk_level: "HIGH",
      risk_category: assessment.riskCategory || "OTHER",
      risk_reason: assessment.reason,
      media_type: assessment.mediaType || media_type || "unknown",
    };
  }

  const detailedCheck = runDetailedAudit({
    name,
    url,
    media_type: assessment.mediaType,
    file_key,
  });

  return {
    risk_status: detailedCheck.passed ? "approved" : "rejected",
    risk_level: detailedCheck.riskLevel || "LOW",
    risk_category: detailedCheck.riskCategory || "NONE",
    risk_reason: detailedCheck.reason || assessment.reason,
    media_type: assessment.mediaType,
  };
}

function runDetailedAudit({ name, url, media_type, file_key }) {
  const combined = `${name || ""} ${url || ""} ${file_key || ""}`;

  if (media_type === "image") {
    const imageRisks = checkImageSpecificRisks(name, url);
    if (imageRisks) return imageRisks;
  }

  if (media_type === "video") {
    const videoRisks = checkVideoSpecificRisks(name, url);
    if (videoRisks) return videoRisks;
  }

  if (media_type === "audio") {
    const audioRisks = checkAudioSpecificRisks(name, url);
    if (audioRisks) return audioRisks;
  }

  const suspiciousUrlPatterns = [
    { pattern: /(redirect|proxy|gateway|shorten|bit\.ly|tinyurl|url\.cn)/i, reason: "URL 包含可疑的重定向或短链接服务", category: "OTHER", level: "MEDIUM" },
    { pattern: /(\.php\?|\.asp\?|\.jsp\?)/i, reason: "URL 可能指向动态脚本而非媒体文件", category: "OTHER", level: "MEDIUM" },
    { pattern: /(token|secret|key)=/i, reason: "URL 可能包含凭据信息", category: "PRIVACY", level: "HIGH" },
    { pattern: /\/\/[^/]*@/, reason: "URL 包含用户信息片段", category: "PRIVACY", level: "HIGH" },
  ];

  for (const rule of suspiciousUrlPatterns) {
    if (rule.pattern.test(combined)) {
      return {
        passed: false,
        riskLevel: rule.level,
        riskCategory: rule.category,
        reason: rule.reason,
      };
    }
  }

  return { passed: true };
}

function checkImageSpecificRisks(name, url) {
  const imageRiskPatterns = [
    { pattern: /(screenshot|截屏|屏幕截图|扫码|二维码)/i, reason: "图片可能包含截屏或二维码内容", category: "OTHER", level: "LOW" },
  ];
  for (const rule of imageRiskPatterns) {
    if (rule.pattern.test(`${name} ${url}`)) {
      return {
        passed: false,
        riskLevel: rule.level,
        riskCategory: rule.category,
        reason: rule.reason,
      };
    }
  }
  return null;
}

function checkVideoSpecificRisks(name, url) {
  const videoRiskPatterns = [
    { pattern: /(live.*stream|直播|美女.*直播|午夜|成人.*播放)/i, reason: "视频可能包含直播或敏感内容", category: "PORN", level: "HIGH" },
    { pattern: /(pirated|盗版|盗录|枪版|ts版本)/i, reason: "视频可能涉及盗版内容", category: "OTHER", level: "MEDIUM" },
  ];
  for (const rule of videoRiskPatterns) {
    if (rule.pattern.test(`${name} ${url}`)) {
      return {
        passed: false,
        riskLevel: rule.level,
        riskCategory: rule.category,
        reason: rule.reason,
      };
    }
  }
  return null;
}

function checkAudioSpecificRisks(name, url) {
  const audioRiskPatterns = [
    { pattern: /(recording.*private|窃听|偷录|秘密.*录音)/i, reason: "音频文件名涉嫌违规录音", category: "PRIVACY", level: "HIGH" },
    { pattern: /(hate.*speech|仇恨.*言论|煽动)/i, reason: "音频可能包含不当言论", category: "POLITICAL", level: "HIGH" },
  ];
  for (const rule of audioRiskPatterns) {
    if (rule.pattern.test(`${name} ${url}`)) {
      return {
        passed: false,
        riskLevel: rule.level,
        riskCategory: rule.category,
        reason: rule.reason,
      };
    }
  }
  return null;
}

module.exports = {
  assessMaterial,
  auditMaterialContent,
  inferMaterialType,
};
