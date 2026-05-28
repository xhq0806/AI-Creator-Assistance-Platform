const test = require('node:test');
const assert = require('node:assert/strict');
const { assessMaterial, inferMaterialType } = require('../src/services/material.service');

test('inferMaterialType detects supported media extensions', () => {
  assert.equal(inferMaterialType('https://example.com/a.webp'), 'image');
  assert.equal(inferMaterialType('https://example.com/a.mp4?x=1'), 'video');
  assert.equal(inferMaterialType('https://example.com/a.mp3'), 'audio');
});

test('assessMaterial rejects unsupported or risky material URLs', () => {
  assert.equal(assessMaterial({ url: 'ftp://example.com/a.jpg' }).valid, false);
  assert.equal(assessMaterial({ url: 'https://example.com/a.exe' }).valid, false);
  assert.equal(assessMaterial({ name: 'casino cover', url: 'https://example.com/a.jpg' }).valid, false);
});

test('assessMaterial accepts normal material URLs', () => {
  const result = assessMaterial({ name: 'cover', url: 'https://example.com/a.jpg' });
  assert.deepEqual(result, {
    valid: true,
    mediaType: 'image',
    reason: '基础校验通过',
  });
});
