const bcrypt = require('bcryptjs');
const User = require('./user.model');
const Article = require('./article.model');
const AuditLog = require('./audit-log.model');
const PromptTemplate = require('./prompt-template.model');
const Material = require('./material.model');
const ArticleVersion = require('./article-version.model');

User.hasMany(Article, { foreignKey: 'user_id' });
Article.belongsTo(User, { foreignKey: 'user_id' });
Article.hasMany(AuditLog, { foreignKey: 'article_id' });
AuditLog.belongsTo(Article, { foreignKey: 'article_id' });
User.hasMany(PromptTemplate, { foreignKey: 'user_id' });
PromptTemplate.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Material, { foreignKey: 'user_id' });
Material.belongsTo(User, { foreignKey: 'user_id' });
Article.hasMany(ArticleVersion, { foreignKey: 'article_id' });
ArticleVersion.belongsTo(Article, { foreignKey: 'article_id' });

async function ensureArticleSchemaUpgrades() {
  const sequelize = User.sequelize;
  const queryInterface = sequelize.getQueryInterface();

  try {
    const articles = await queryInterface.describeTable('articles');
    const counterColumns = ['like_count', 'favorite_count', 'negative_count'];

    for (const column of counterColumns) {
      if (!articles[column]) {
        await queryInterface.addColumn('articles', column, {
          type: Article.rawAttributes[column].type,
          defaultValue: 0,
        });
      }
    }

    await sequelize.query(
      "ALTER TABLE `articles` MODIFY `status` ENUM('draft', 'pending_review', 'published', 'rejected', 'withdrawn') DEFAULT 'draft'",
    );
  } catch (error) {
    console.warn('[schema] article upgrade skipped:', error.message);
  }
}

async function syncModels() {
  await User.sequelize.sync();
  await ensureArticleSchemaUpgrades();
  const admin = await User.findOne({ where: { username: 'admin' } });
  if (!admin) {
    await User.create({
      username: 'admin',
      password_hash: await bcrypt.hash('admin123', 10),
      email: 'admin@example.com',
    });
  }

  const defaultPrompts = [
    {
      name: '信息增量短图文',
      category: '短图文',
      content: '将素材改写成一篇适合今日头条的信息增量型短图文，要求标题有冲突感，正文分 3 段。',
    },
    {
      name: '种草内容',
      category: '种草',
      content: '围绕核心素材生成一篇种草内容，突出真实体验、适用人群和行动建议。',
    },
    {
      name: '长文大纲',
      category: '长文',
      content: '把以下观点扩展成长文大纲，包含开头钩子、关键论点、案例和结尾互动。',
    },
  ];

  for (const prompt of defaultPrompts) {
    const existed = await PromptTemplate.findOne({
      where: {
        user_id: null,
        name: prompt.name,
      },
    });
    if (!existed) {
      await PromptTemplate.create(prompt);
    }
  }
}

module.exports = {
  User,
  Article,
  AuditLog,
  PromptTemplate,
  Material,
  ArticleVersion,
  syncModels,
};
