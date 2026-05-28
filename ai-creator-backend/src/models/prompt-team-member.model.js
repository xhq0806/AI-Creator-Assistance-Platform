const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PromptTeamMember = sequelize.define(
  'PromptTeamMember',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    team_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('viewer', 'editor', 'admin'),
      allowNull: false,
      defaultValue: 'viewer',
    },
  },
  {
    tableName: 'prompt_team_members',
    indexes: [
      {
        unique: true,
        name: 'uk_team_user',
        fields: ['team_id', 'user_id'],
      },
    ],
  },
);

module.exports = PromptTeamMember;
