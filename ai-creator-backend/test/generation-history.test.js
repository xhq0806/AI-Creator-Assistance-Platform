const test = require('node:test');
const assert = require('node:assert/strict');
const { TEXT_GENERATION_MODES } = require('../src/services/generation-history.service');

test('TEXT_GENERATION_MODES includes all text generation modes', () => {
  assert.deepEqual(TEXT_GENERATION_MODES, [
    'full_generation',
    'structured',
    'rewrite',
    'outline',
  ]);
});
