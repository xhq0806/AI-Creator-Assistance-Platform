const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const DOWNLOAD_TIMEOUT_MS = 30_000;

function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

function extFromContentType(contentType) {
  const type = String(contentType || '').toLowerCase();
  if (type.includes('png')) return '.png';
  if (type.includes('webp')) return '.webp';
  if (type.includes('gif')) return '.gif';
  if (type.includes('jpeg') || type.includes('jpg')) return '.jpg';
  return '.jpg';
}

function extFromUrl(url) {
  const match = String(url).match(/\.(png|jpe?g|gif|webp)(\?|$)/i);
  if (!match) return '.jpg';
  const ext = match[1].toLowerCase();
  return ext === 'jpeg' ? '.jpg' : `.${ext}`;
}

function buildFilename(ext) {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
}

function writeBuffer(buffer, ext) {
  ensureUploadsDir();
  const filename = buildFilename(ext);
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  return `/uploads/${filename}`;
}

function isAlreadyPersisted(url) {
  const value = String(url || '').trim();
  return value.startsWith('/uploads/');
}

async function persistDataImageUrl(url) {
  const match = String(url).match(/^data:(image\/[^;]+);base64,(.+)$/i);
  if (!match) return url;
  const buffer = Buffer.from(match[2], 'base64');
  return writeBuffer(buffer, extFromContentType(match[1]));
}

async function persistHttpImageUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AI-Creator-Platform/1.0' },
    });
    if (!response.ok) {
      return url;
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());
    const ext = extFromContentType(contentType) || extFromUrl(url);
    return writeBuffer(buffer, ext);
  } catch {
    return url;
  } finally {
    clearTimeout(timer);
  }
}

async function persistRemoteImageUrl(url) {
  const value = String(url || '').trim();
  if (!value || isAlreadyPersisted(value)) {
    return value;
  }
  if (value.startsWith('data:image/')) {
    return persistDataImageUrl(value);
  }
  if (/^https?:\/\//i.test(value)) {
    return persistHttpImageUrl(value);
  }
  return value;
}

async function persistMediaUrls(urls) {
  if (!Array.isArray(urls) || !urls.length) {
    return urls || [];
  }
  return Promise.all(urls.map((url) => persistRemoteImageUrl(url)));
}

async function persistImageResult(result) {
  if (!result?.media_urls?.length) {
    return result;
  }
  const media_urls = await persistMediaUrls(result.media_urls);
  return { ...result, media_urls };
}

module.exports = {
  persistRemoteImageUrl,
  persistMediaUrls,
  persistImageResult,
};
