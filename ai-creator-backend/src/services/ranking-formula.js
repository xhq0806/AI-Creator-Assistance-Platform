function calculateHotScore(article, now = Date.now()) {
  const createdAt = new Date(article.created_at || article.createdAt).getTime();
  const ageInHours = Math.max(0, (now - createdAt) / 36e5);
  const qualityScore = Number(article.quality_score || 0);
  const aiRankScore = Number(article.ai_rank_score || 0);
  const viewCount = Number(article.view_count || 0);
  const likeCount = Number(article.like_count || 0);
  const favoriteCount = Number(article.favorite_count || 0);
  const negativeCount = Number(article.negative_count || 0);
  const positiveFeedback = likeCount + favoriteCount * 2;

  return (
    qualityScore * 0.35 +
    aiRankScore * 0.25 +
    Math.log(viewCount + 1) * 0.35 +
    Math.log(positiveFeedback + 1) * 0.3 -
    negativeCount * 0.35 -
    ageInHours * 0.2
  );
}

module.exports = {
  calculateHotScore,
};
