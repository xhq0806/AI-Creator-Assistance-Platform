const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateHotScore } = require('../src/services/ranking-formula');

test('calculateHotScore combines quality, views, and time decay', () => {
  const now = Date.parse('2026-05-28T12:00:00.000Z');
  const score = calculateHotScore(
    {
      quality_score: 80,
      view_count: 99,
      created_at: '2026-05-28T10:00:00.000Z',
    },
    now,
  );

  const expected = 80 * 0.4 + Math.log(100) * 0.4 - 2 * 0.2;
  assert.equal(score, expected);
});

test('calculateHotScore includes positive and negative feedback', () => {
  const now = Date.parse('2026-05-28T12:00:00.000Z');
  const score = calculateHotScore(
    {
      quality_score: 70,
      view_count: 9,
      like_count: 3,
      favorite_count: 2,
      negative_count: 1,
      created_at: '2026-05-28T12:00:00.000Z',
    },
    now,
  );

  const expected = 70 * 0.4 + Math.log(10) * 0.4 + Math.log(8) * 0.3 - 0.3;
  assert.equal(score, expected);
});

test('calculateHotScore does not reward future timestamps', () => {
  const now = Date.parse('2026-05-28T12:00:00.000Z');
  const score = calculateHotScore(
    {
      quality_score: 50,
      view_count: 0,
      created_at: '2026-05-28T13:00:00.000Z',
    },
    now,
  );

  assert.equal(score, 20);
});
