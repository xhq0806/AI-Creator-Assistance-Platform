const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PromptTeam = sequelize.define(
  'PromptTeam',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    owner_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
  },
  {
    tableName: 'prompt_teams',
  },
);

module.exports = PromptTeam;
