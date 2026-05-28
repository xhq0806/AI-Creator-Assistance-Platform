function normalizeDraftForSync(draft, userId) {
  const title = draft.title || '未命名草稿';
  const content = draft.content || '';

  return {
    user_id: userId,
    title,
    content,
    media_urls: draft.media_urls || [],
    status: 'draft',
    quality_score: 0,
  };
}

function isMeaningfulDraftPayload(payload) {
  return Boolean(payload.content.trim() || payload.title !== '未命名草稿' || payload.media_urls.length);
}

module.exports = {
  normalizeDraftForSync,
  isMeaningfulDraftPayload,
};
