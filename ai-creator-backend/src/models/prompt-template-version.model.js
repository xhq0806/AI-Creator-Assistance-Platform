const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PromptTemplateVersion = sequelize.define(
  'PromptTemplateVersion',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    template_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    version_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    change_note: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    created_by: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
  },
  {
    tableName: 'prompt_template_versions',
    indexes: [
      {
        unique: true,
        name: 'uk_template_version',
        fields: ['template_id', 'version_no'],
      },
    ],
  },
);

module.exports = PromptTemplateVersion;
