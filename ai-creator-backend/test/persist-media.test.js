const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  persistRemoteImageUrl,
  persistMediaUrls,
  persistImageResult,
} = require('../src/utils/persistMedia');

const uploadsDir = path.join(__dirname, '..', 'uploads');

test('persistRemoteImageUrl keeps already persisted /uploads paths', async () => {
  const url = '/uploads/demo.jpg';
  assert.equal(await persistRemoteImageUrl(url), url);
});

test('persistRemoteImageUrl saves data:image URLs to uploads', async () => {
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const dataUrl = `data:image/png;base64,${pngBase64}`;
  const saved = await persistRemoteImageUrl(dataUrl);

  assert.match(saved, /^\/uploads\/\d+-[a-z0-9]+\.png$/);
  const filePath = path.join(uploadsDir, path.basename(saved));
  assert.equal(fs.existsSync(filePath), true);
  fs.unlinkSync(filePath);
});

test('persistMediaUrls preserves order and skips persisted entries', async () => {
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const dataUrl = `data:image/png;base64,${pngBase64}`;
  const local = '/uploads/existing.jpg';
  const result = await persistMediaUrls([local, dataUrl]);

  assert.equal(result[0], local);
  assert.match(result[1], /^\/uploads\//);
  fs.unlinkSync(path.join(uploadsDir, path.basename(result[1])));
});

test('persistImageResult updates media_urls on image generation payload', async () => {
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const dataUrl = `data:image/png;base64,${pngBase64}`;
  const result = await persistImageResult({
    media_urls: [dataUrl],
    cover_prompt: 'test',
    provider: 'test',
  });

  assert.match(result.media_urls[0], /^\/uploads\//);
  assert.equal(result.cover_prompt, 'test');
  fs.unlinkSync(path.join(uploadsDir, path.basename(result.media_urls[0])));
});
