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
    per_category_metrics: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '按风险类别拆分的 metrics，每个类别包含 accuracy/precision/recall/f1',
    },
    per_risk_level_metrics: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '按风险等级拆分的 metrics',
    },
    confusion_matrix: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '多分类混淆矩阵 {SAFE:{SAFE:N,RISK_LOW:N,...}, ...}',
    },
  },
  {
    tableName: 'audit_evaluation_reports',
    updatedAt: false,
  },
);

module.exports = AuditEvaluationReport;
