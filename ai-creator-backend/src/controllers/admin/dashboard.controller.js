const { Op, fn, col, literal } = require('sequelize');
const { User, Article } = require('../../models');
const { ok } = require('../../utils/apiResponse');

async function getPlatformOverview(req, res, next) {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { status: 'active' } });
    const totalArticles = await Article.count();
    const publishedArticles = await Article.count({ where: { status: 'published' } });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const generationsToday = await Article.count({
      where: { created_at: { [Op.gte]: todayStart } },
    });
    const pendingReview = await Article.count({ where: { status: 'pending_review' } });
    const rejectedArticles = await Article.count({ where: { status: 'rejected' } });

    return ok(res, {
      totalUsers,
      activeUsers,
      disabledUsers: totalUsers - activeUsers,
      totalArticles,
      publishedArticles,
      pendingReview,
      rejectedArticles,
      generationsToday,
    });
  } catch (error) {
    return next(error);
  }
}

async function getTrendData(req, res, next) {
  try {
    const days = Math.min(Number(req.query.days) || 30, 90);
    const series = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);

      const [articleCount, userCount] = await Promise.all([
        Article.count({
          where: { created_at: { [Op.gte]: dayStart, [Op.lt]: dayEnd } },
        }),
        User.count({
          where: { created_at: { [Op.gte]: dayStart, [Op.lt]: dayEnd } },
        }),
      ]);

      series.push({
        date: dayStart.toISOString().slice(0, 10),
        articles: articleCount,
        users: userCount,
      });
    }

    return ok(res, { series });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getPlatformOverview,
  getTrendData,
};
