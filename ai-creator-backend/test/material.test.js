const test = require('node:test');
const assert = require('node:assert/strict');
const { assessMaterial, auditMaterialContent, inferMaterialType } = require('../src/services/material.service');

test('inferMaterialType detects supported media extensions', () => {
  assert.equal(inferMaterialType('https://example.com/a.webp'), 'image');
  assert.equal(inferMaterialType('https://example.com/a.mp4?x=1'), 'video');
  assert.equal(inferMaterialType('https://example.com/a.mp3'), 'audio');
  assert.equal(inferMaterialType('https://example.com/a.bmp'), 'image');
  assert.equal(inferMaterialType('https://example.com/a.mov'), 'video');
  assert.equal(inferMaterialType('https://example.com/a.m4a'), 'audio');
});

test('assessMaterial rejects non-http URLs', () => {
  assert.equal(assessMaterial({ url: 'ftp://example.com/a.jpg' }).valid, false);
  assert.equal(assessMaterial({ url: '' }).valid, false);
  assert.equal(assessMaterial({ url: 'not-a-url' }).valid, false);
});

test('assessMaterial rejects blocked extensions', () => {
  assert.equal(assessMaterial({ name: 'malware.exe', url: 'https://example.com/img.jpg' }).valid, false);
  assert.equal(assessMaterial({ name: 'archive.zip', url: 'https://example.com/archive.zip' }).valid, false);
});

test('assessMaterial rejects long URLs', () => {
  const longUrl = 'https://example.com/' + 'a'.repeat(490) + '.jpg';
  assert.equal(assessMaterial({ url: longUrl }).valid, false);
});

test('assessMaterial accepts normal material URLs', () => {
  const result = assessMaterial({ name: 'cover', url: 'https://example.com/a.jpg' });
  assert.deepEqual(result, {
    valid: true,
    mediaType: 'image',
    reason: '基础校验通过',
  });
});

test('assessMaterial detects risky keywords', () => {
  const pornResult = assessMaterial({ name: 'nude photo', url: 'https://example.com/img.jpg' });
  assert.equal(pornResult.valid, false);
  assert.equal(pornResult.riskCategory, 'PORN');

  const gamblingResult = assessMaterial({ name: 'casino slot', url: 'https://example.com/v.mp4' });
  assert.equal(gamblingResult.valid, false);
  assert.equal(gamblingResult.riskCategory, 'GAMBLING');

  const drugResult = assessMaterial({ name: 'cocaine', url: 'https://example.com/a.mp3' });
  assert.equal(drugResult.valid, false);
  assert.equal(drugResult.riskCategory, 'DRUG');
});

test('assessMaterial enforces file size limits', () => {
  assert.equal(
    assessMaterial({ name: 'big', url: 'https://x.com/a.jpg', file_size: 11 * 1024 * 1024 }).valid,
    false
  );
  assert.equal(
    assessMaterial({ name: 'big', url: 'https://x.com/a.jpg', file_size: 5 * 1024 * 1024 }).valid,
    true
  );
});

test('assessMaterial uses mime_type for type inference', () => {
  const result = assessMaterial({
    name: 'data',
    url: 'https://example.com/file.bin',
    mime_type: 'image/png',
  });
  assert.equal(result.valid, true);
  assert.equal(result.mediaType, 'image');
});

test('auditMaterialContent rejects risky materials', () => {
  const result = auditMaterialContent({
    name: 'porn nude pic',
    url: 'https://example.com/img.jpg',
  });
  assert.equal(result.risk_status, 'rejected');
  assert.equal(result.risk_category, 'PORN');
});

test('auditMaterialContent approves safe materials', () => {
  const result = auditMaterialContent({
    name: 'product cover',
    url: 'https://example.com/product.jpg',
  });
  assert.equal(result.risk_status, 'approved');
  assert.equal(result.risk_category, 'NONE');
});

test('auditMaterialContent detects suspicious URLs', () => {
  const result = auditMaterialContent({
    name: 'image',
    url: 'https://bit.ly/img.jpg',
  });
  assert.equal(result.risk_status, 'rejected');
  assert.equal(result.risk_category, 'OTHER');
});

test('auditMaterialContent detects video risks', () => {
  const result = auditMaterialContent({
    name: '午夜直播',
    url: 'https://example.com/live.mp4',
    mime_type: 'video/mp4',
  });
  assert.equal(result.risk_status, 'rejected');
});

test('auditMaterialContent detects audio risks', () => {
  const result = auditMaterialContent({
    name: '窃听录音',
    url: 'https://example.com/rec.mp3',
    mime_type: 'audio/mpeg',
  });
  assert.equal(result.risk_status, 'rejected');
});

test('auditMaterialContent returns media_type for safe content', () => {
  const result = auditMaterialContent({
    name: 'intro',
    url: 'https://example.com/trailer.mp4',
    mime_type: 'video/mp4',
  });
  assert.equal(result.risk_status, 'approved');
  assert.equal(result.media_type, 'video');
});
