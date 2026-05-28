const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    article_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    risk_category: DataTypes.STRING(50),
    is_compliant: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    raw_ai_response: DataTypes.TEXT,
  },
  {
    tableName: 'audit_logs',
    updatedAt: false,
  },
);

module.exports = AuditLog;
