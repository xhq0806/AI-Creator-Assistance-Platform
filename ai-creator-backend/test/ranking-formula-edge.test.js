const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateHotScore } = require("../src/services/ranking-formula");

test("calculateHotScore handles zero view count", () => {
  const now = Date.parse("2026-05-28T12:00:00.000Z");
  const score = calculateHotScore(
    {
      quality_score: 50,
      view_count: 0,
      created_at: "2026-05-28T12:00:00.000Z",
    },
    now
  );
  const expected = 50 * 0.35 + Math.log(1) * 0.35;
  assert.equal(score, expected);
});

test("calculateHotScore handles null optional fields", () => {
  const now = Date.parse("2026-05-28T12:00:00.000Z");
  const score = calculateHotScore(
    {
      quality_score: 60,
      view_count: 10,
      like_count: null,
      favorite_count: undefined,
      negative_count: null,
      created_at: "2026-05-28T12:00:00.000Z",
    },
    now
  );
  const expected = 60 * 0.35 + Math.log(11) * 0.35;
  assert.equal(score, expected);
});

test("calculateHotScore handles very old articles with time decay", () => {
  const now = Date.parse("2026-05-28T12:00:00.000Z");
  const score = calculateHotScore(
    {
      quality_score: 100,
      view_count: 100000,
      like_count: 500,
      favorite_count: 200,
      created_at: "2026-05-26T12:00:00.000Z",
    },
    now
  );
  const hours = 48;
  const positiveFeedback = 500 + 200 * 2;
  const expected =
    100 * 0.35 +
    Math.log(100001) * 0.35 +
    Math.log(positiveFeedback + 1) * 0.3 -
    hours * 0.2;
  assert.equal(score, expected);
});

test("calculateHotScore negative feedback reduces score", () => {
  const now = Date.parse("2026-05-28T12:00:00.000Z");
  const withNegative = calculateHotScore(
    {
      quality_score: 50,
      view_count: 100,
      negative_count: 50,
      created_at: "2026-05-28T12:00:00.000Z",
    },
    now
  );
  const withoutNegative = calculateHotScore(
    {
      quality_score: 50,
      view_count: 100,
      negative_count: 0,
      created_at: "2026-05-28T12:00:00.000Z",
    },
    now
  );
  assert.ok(
    withNegative < withoutNegative,
    "Negative feedback should reduce score"
  );
});

test("calculateHotScore empty feedback fields defaults to 0", () => {
  const now = Date.parse("2026-05-28T12:00:00.000Z");
  const score = calculateHotScore(
    {
      quality_score: 60,
      view_count: 10,
      created_at: "2026-05-28T12:00:00.000Z",
    },
    now
  );
  const expected = 60 * 0.35 + Math.log(11) * 0.35;
  assert.equal(score, expected);
});

test("calculateHotScore uses default weight constants", () => {
  const now = Date.parse("2026-05-28T12:00:00.000Z");
  const score = calculateHotScore(
    {
      quality_score: 80,
      view_count: 500,
      like_count: 20,
      favorite_count: 10,
      negative_count: 2,
      created_at: "2026-05-28T10:00:00.000Z",
    },
    now
  );
  const positiveFeedback = 20 + 10 * 2;
  const expected =
    80 * 0.35 +
    Math.log(501) * 0.35 +
    Math.log(positiveFeedback + 1) * 0.3 -
    2 * 0.35 -
    2 * 0.2;
  assert.equal(score, expected);
});
