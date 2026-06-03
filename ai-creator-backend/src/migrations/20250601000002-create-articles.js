"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("articles", {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: "users", key: "id" },
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      content: { type: Sequelize.TEXT("long"), allowNull: false },
      media_urls: { type: Sequelize.JSON },
      status: {
        type: Sequelize.ENUM("draft", "pending_review", "published", "rejected", "withdrawn"),
        defaultValue: "draft",
      },
      category: { type: Sequelize.STRING(32), defaultValue: "通用" },
      quality_score: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0.0 },
      ai_rank_score: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0.0 },
      ai_rank_reason: { type: Sequelize.STRING(512), defaultValue: "" },
      ai_rank_tags: { type: Sequelize.JSON },
      view_count: { type: Sequelize.INTEGER.UNSIGNED, defaultValue: 0 },
      like_count: { type: Sequelize.INTEGER.UNSIGNED, defaultValue: 0 },
      favorite_count: { type: Sequelize.INTEGER.UNSIGNED, defaultValue: 0 },
      negative_count: { type: Sequelize.INTEGER.UNSIGNED, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP") },
    });

    await queryInterface.addIndex("articles", ["status", "quality_score"], { name: "idx_quality_status" });
    await queryInterface.addIndex("articles", ["status", "ai_rank_score"], { name: "idx_ai_rank_status" });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("articles");
  },
};
