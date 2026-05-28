function calculateHotScore(article, now = Date.now()) {
  const createdAt = new Date(article.created_at || article.createdAt).getTime();
  const ageInHours = Math.max(0, (now - createdAt) / 36e5);
  const qualityScore = Number(article.quality_score || 0);
  const viewCount = Number(article.view_count || 0);

  return qualityScore * 0.4 + Math.log(viewCount + 1) * 0.4 - ageInHours * 0.2;
}

module.exports = {
  calculateHotScore,
};
