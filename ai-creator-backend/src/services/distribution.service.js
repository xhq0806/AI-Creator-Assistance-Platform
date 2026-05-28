function createPlatformItemId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function syncToPlatforms(article, platforms) {
  const result = {
    sync_status: 'SUCCESS',
  };

  if (platforms.includes('toutiao')) {
    result.toutiao_item_id = createPlatformItemId('tt');
  }

  if (platforms.includes('douyin')) {
    result.douyin_item_id = createPlatformItemId('dy');
  }

  return {
    article_id: article.id,
    ...result,
  };
}

module.exports = {
  syncToPlatforms,
};
