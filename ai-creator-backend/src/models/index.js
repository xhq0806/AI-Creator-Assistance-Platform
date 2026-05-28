const bcrypt = require('bcryptjs');
const User = require('./user.model');
const Article = require('./article.model');
const AuditLog = require('./audit-log.model');

User.hasMany(Article, { foreignKey: 'user_id' });
Article.belongsTo(User, { foreignKey: 'user_id' });
Article.hasMany(AuditLog, { foreignKey: 'article_id' });
AuditLog.belongsTo(Article, { foreignKey: 'article_id' });

async function syncModels() {
  await User.sequelize.sync();
  const admin = await User.findOne({ where: { username: 'admin' } });
  if (!admin) {
    await User.create({
      username: 'admin',
      password_hash: await bcrypt.hash('admin123', 10),
      email: 'admin@example.com',
    });
  }
}

module.exports = {
  User,
  Article,
  AuditLog,
  syncModels,
};
