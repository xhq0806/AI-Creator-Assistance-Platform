const bcrypt = require('bcryptjs');
const User = require('./user.model');
const Article = require('./article.model');
const AuditLog = require('./audit-log.model');
const PromptTemplate = require('./prompt-template.model');
const Material = require('./material.model');
const ArticleVersion = require('./article-version.model');
const PromptTeam = require('./prompt-team.model');
const PromptTeamMember = require('./prompt-team-member.model');
const PromptTemplateVersion = require('./prompt-template-version.model');
const AuditManualAnnotation = require('./audit-manual-annotation.model');
const AuditEvaluationReport = require('./audit-evaluation-report.model');

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

User.hasMany(PromptTeam, { foreignKey: 'owner_id' });
PromptTeam.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
PromptTeam.hasMany(PromptTeamMember, { foreignKey: 'team_id' });
PromptTeamMember.belongsTo(PromptTeam, { foreignKey: 'team_id' });
User.hasMany(PromptTeamMember, { foreignKey: 'user_id' });
PromptTeamMember.belongsTo(User, { foreignKey: 'user_id' });
PromptTeam.hasMany(PromptTemplate, { foreignKey: 'team_id' });
PromptTemplate.belongsTo(PromptTeam, { foreignKey: 'team_id' });
PromptTemplate.hasMany(PromptTemplateVersion, { foreignKey: 'template_id' });
PromptTemplateVersion.belongsTo(PromptTemplate, { foreignKey: 'template_id' });
User.hasMany(PromptTemplateVersion, { foreignKey: 'created_by' });
PromptTemplateVersion.belongsTo(User, { foreignKey: 'created_by' });
Article.hasMany(AuditManualAnnotation, { foreignKey: 'article_id' });
AuditManualAnnotation.belongsTo(Article, { foreignKey: 'article_id' });
User.hasMany(AuditManualAnnotation, { foreignKey: 'annotator_id' });
AuditManualAnnotation.belongsTo(User, { foreignKey: 'annotator_id' });

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

async function ensurePromptTemplateSchemaUpgrades() {
  const sequelize = User.sequelize;
  const queryInterface = sequelize.getQueryInterface();

  try {
    const prompts = await queryInterface.describeTable('prompt_templates');
    if (!prompts.team_id) {
      await queryInterface.addColumn('prompt_templates', 'team_id', {
        type: PromptTemplate.rawAttributes.team_id.type,
        allowNull: true,
        after: 'user_id',
      });
    }
    if (!prompts.visibility) {
      await queryInterface.addColumn('prompt_templates', 'visibility', {
        type: PromptTemplate.rawAttributes.visibility.type,
        allowNull: false,
        defaultValue: 'private',
      });
    }
  } catch (error) {
    console.warn('[schema] prompt template upgrade skipped:', error.message);
  }
}

async function ensureMaterialSchemaUpgrades() {
  const sequelize = User.sequelize;
  const queryInterface = sequelize.getQueryInterface();

  try {
    const materials = await queryInterface.describeTable('materials');
    if (!materials.file_key) {
      await queryInterface.addColumn('materials', 'file_key', {
        type: Material.rawAttributes.file_key.type,
        allowNull: true,
      });
    }
    if (!materials.file_size) {
      await queryInterface.addColumn('materials', 'file_size', {
        type: Material.rawAttributes.file_size.type,
        allowNull: true,
      });
    }
    if (!materials.mime_type) {
      await queryInterface.addColumn('materials', 'mime_type', {
        type: Material.rawAttributes.mime_type.type,
        allowNull: true,
      });
    }
    if (!materials.upload_status) {
      await queryInterface.addColumn('materials', 'upload_status', {
        type: Material.rawAttributes.upload_status.type,
        allowNull: false,
        defaultValue: 'done',
      });
    }
  } catch (error) {
    console.warn('[schema] material upgrade skipped:', error.message);
  }
}

async function syncModels() {
  await User.sequelize.sync();
  await ensureArticleSchemaUpgrades();
  await ensurePromptTemplateSchemaUpgrades();
  await ensureMaterialSchemaUpgrades();

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
      visibility: 'system_public',
      content: '将素材改写成一篇适合今日头条的信息增量型短图文，要求标题有冲突感，正文分 3 段。',
    },
    {
      name: '种草内容',
      category: '种草',
      visibility: 'system_public',
      content: '围绕核心素材生成一篇种草内容，突出真实体验、适用人群和行动建议。',
    },
    {
      name: '长文大纲',
      category: '长文',
      visibility: 'system_public',
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
  PromptTeam,
  PromptTeamMember,
  PromptTemplateVersion,
  AuditManualAnnotation,
  AuditEvaluationReport,
  syncModels,
};
