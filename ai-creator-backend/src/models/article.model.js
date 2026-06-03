const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Article = sequelize.define(
  "Article",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    media_urls: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        "draft",
        "pending_review",
        "published",
        "rejected",
        "withdrawn"
      ),
      defaultValue: "draft",
    },
    quality_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    ai_rank_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    ai_rank_reason: {
      type: DataTypes.STRING(512),
      defaultValue: "",
    },
    ai_rank_tags: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    view_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    like_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    favorite_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    negative_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    category: {
      type: DataTypes.STRING(32),
      defaultValue: "通用",
      index: true,
    },
    prompt: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "创作提示词",
    },
  },
  {
    tableName: "articles",
    indexes: [
      {
        name: "idx_quality_status",
        fields: ["status", "quality_score"],
      },
      {
        name: "idx_user_status",
        fields: ["user_id", "status"],
      },
      {
        name: "idx_status_category",
        fields: ["status", "category"],
      },
      {
        name: "idx_status_rank",
        fields: ["status", "ai_rank_score"],
      },
    ],
  }
);

module.exports = Article;
