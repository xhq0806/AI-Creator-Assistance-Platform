const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserFeedback = sequelize.define(
  'UserFeedback',
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
    article_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('like', 'favorite', 'negative'),
      allowNull: false,
    },
  },
  {
    tableName: 'user_feedbacks',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'article_id', 'type'],
      },
    ],
  },
);

module.exports = UserFeedback;
