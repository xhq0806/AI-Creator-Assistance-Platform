const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GenerationHistory = sequelize.define(
  'GenerationHistory',
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
    prompt: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    mode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'full_generation',
    },
    result: {
      type: DataTypes.JSON,
      allowNull: false,
    },
  },
  {
    tableName: 'generation_histories',
    updatedAt: false,
  },
);

module.exports = GenerationHistory;
