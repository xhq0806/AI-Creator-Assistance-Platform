const allowedExtensions = {
  image: /\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i,
  video: /\.(mp4|mov|webm)(\?.*)?$/i,
  audio: /\.(mp3|wav|aac|m4a)(\?.*)?$/i,
};

const riskyKeywordPattern = /(porn|sex|casino|gambling|drug|cocaine|heroin|violence|terror|涉黄|赌博|博彩|毒品|暴恐)/i;

function inferMaterialType(url) {
  if (allowedExtensions.image.test(url)) {
    return 'image';
  }
  if (allowedExtensions.video.test(url)) {
    return 'video';
  }
  if (allowedExtensions.audio.test(url)) {
    return 'audio';
  }
  return undefined;
}

function assessMaterial({ name = '', url = '' }) {
  const normalizedUrl = String(url).trim();

  if (!/^https?:\/\/.+/i.test(normalizedUrl)) {
    return {
      valid: false,
      reason: '素材必须是 http 或 https URL',
    };
  }

  if (normalizedUrl.length > 500) {
    return {
      valid: false,
      reason: '素材 URL 长度不能超过 500 个字符',
    };
  }

  const mediaType = inferMaterialType(normalizedUrl);
  if (!mediaType) {
    return {
      valid: false,
      reason: '仅支持图片、视频或音频素材',
    };
  }

  if (riskyKeywordPattern.test(`${name} ${normalizedUrl}`)) {
    return {
      valid: false,
      mediaType,
      reason: '素材名称或 URL 命中基础风险词',
    };
  }

  return {
    valid: true,
    mediaType,
    reason: '基础校验通过',
  };
}

module.exports = {
  assessMaterial,
  inferMaterialType,
};
