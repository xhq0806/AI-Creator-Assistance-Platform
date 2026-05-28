const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Material = sequelize.define(
  'Material',
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
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING(600),
      allowNull: false,
    },
    file_key: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    file_size: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    mime_type: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    media_type: {
      type: DataTypes.ENUM('image', 'video', 'audio'),
      allowNull: false,
    },
    upload_status: {
      type: DataTypes.ENUM('pending', 'uploading', 'done', 'failed'),
      allowNull: false,
      defaultValue: 'done',
    },
    risk_status: {
      type: DataTypes.ENUM('approved', 'rejected'),
      allowNull: false,
      defaultValue: 'approved',
    },
    risk_reason: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: '基础校验通过',
    },
  },
  {
    tableName: 'materials',
    indexes: [
      {
        name: 'idx_material_user_type',
        fields: ['user_id', 'media_type'],
      },
    ],
  },
);

module.exports = Material;
