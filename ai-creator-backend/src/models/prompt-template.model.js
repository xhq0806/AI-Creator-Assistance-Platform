const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PromptTemplate = sequelize.define(
  'PromptTemplate',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: '通用',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    usage_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
  },
  {
    tableName: 'prompt_templates',
  },
);

module.exports = PromptTemplate;
