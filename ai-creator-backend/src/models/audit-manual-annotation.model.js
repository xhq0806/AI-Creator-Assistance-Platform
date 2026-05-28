const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditManualAnnotation = sequelize.define(
  'AuditManualAnnotation',
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
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    ai_prediction_risk: {
      type: DataTypes.ENUM('SAFE', 'RISK_LOW', 'RISK_MEDIUM', 'RISK_HIGH'),
      allowNull: false,
    },
    ground_truth_risk: {
      type: DataTypes.ENUM('SAFE', 'RISK_LOW', 'RISK_MEDIUM', 'RISK_HIGH'),
      allowNull: false,
    },
    risk_category: {
      type: DataTypes.ENUM('NONE', 'PORN', 'GAMBLING', 'DRUG', 'POLITICAL', 'OTHER'),
      allowNull: false,
      defaultValue: 'NONE',
    },
    annotator_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    annotation_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    annotated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'audit_manual_annotations',
  },
);

module.exports = AuditManualAnnotation;
