const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ArticleVersion = sequelize.define(
  'ArticleVersion',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    article_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    version_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
    media_urls: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    quality_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    source: {
      type: DataTypes.ENUM('draft_save', 'publish', 'offline_sync', 'restore', 'withdraw'),
      allowNull: false,
      defaultValue: 'draft_save',
    },
  },
  {
    tableName: 'article_versions',
    updatedAt: false,
    indexes: [
      {
        name: 'idx_article_version',
        fields: ['article_id', 'version_no'],
      },
    ],
  },
);

module.exports = ArticleVersion;
