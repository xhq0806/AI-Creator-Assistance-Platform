const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDraftForSync, isMeaningfulDraftPayload } = require('../src/services/draft-sync.service');

test('normalizeDraftForSync fills defaults used by offline sync', () => {
  const payload = normalizeDraftForSync(
    {
      media_urls: ['https://example.com/cover.webp'],
    },
    7,
  );

  assert.deepEqual(payload, {
    user_id: 7,
    title: '未命名草稿',
    content: '',
    media_urls: ['https://example.com/cover.webp'],
    status: 'draft',
    quality_score: 0,
  });
});

test('isMeaningfulDraftPayload skips fully empty drafts', () => {
  assert.equal(
    isMeaningfulDraftPayload({
      title: '未命名草稿',
      content: '',
      media_urls: [],
    }),
    false,
  );
});

test('isMeaningfulDraftPayload keeps drafts with title, content, or media', () => {
  assert.equal(isMeaningfulDraftPayload({ title: '标题', content: '', media_urls: [] }), true);
  assert.equal(isMeaningfulDraftPayload({ title: '未命名草稿', content: '正文', media_urls: [] }), true);
  assert.equal(isMeaningfulDraftPayload({ title: '未命名草稿', content: '', media_urls: ['https://example.com/a.jpg'] }), true);
});
