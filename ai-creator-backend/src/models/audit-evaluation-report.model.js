const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditEvaluationReport = sequelize.define(
  'AuditEvaluationReport',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    total_samples: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    accuracy_rate: {
      type: DataTypes.DECIMAL(7, 6),
      allowNull: false,
    },
    precision_rate: {
      type: DataTypes.DECIMAL(7, 6),
      allowNull: false,
    },
    recall_rate: {
      type: DataTypes.DECIMAL(7, 6),
      allowNull: false,
    },
    f1_score: {
      type: DataTypes.DECIMAL(7, 6),
      allowNull: false,
    },
  },
  {
    tableName: 'audit_evaluation_reports',
    updatedAt: false,
  },
);

module.exports = AuditEvaluationReport;
