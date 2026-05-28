const { AuditManualAnnotation, AuditEvaluationReport, AuditLog, Article, User } = require('../models');
const { ok, fail } = require('../utils/apiResponse');
const { sequelize } = require('../models');

async function createAnnotation(req, res) {
  try {
    const { article_id, title, content, ai_prediction_risk, ground_truth_risk, risk_category, annotation_note } = req.body;
    const userId = req.user?.id;
    const annotation = await AuditManualAnnotation.create({
      article_id: article_id || null,
      title,
      content,
      ai_prediction_risk,
      ground_truth_risk,
      risk_category: risk_category || 'NONE',
      annotator_id: userId,
      annotation_note,
      annotated_at: new Date(),
    });
    return ok(res, annotation);
  } catch (error) {
    return fail(res, error.message);
  }
}

async function listAnnotations(req, res) {
  try {
    const annotations = await AuditManualAnnotation.findAll({
      include: [{ model: User, as: 'annotator', attributes: ['id', 'username'] }],
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    return ok(res, annotations);
  } catch (error) {
    return fail(res, error.message);
  }
}

async function generateEvaluationReport(req, res) {
  try {
    const annotations = await AuditManualAnnotation.findAll({
      where: { annotated_at: { [sequelize.Sequelize.Op.ne]: null } },
    });

    if (annotations.length === 0) {
      return fail(res, '没有已标注的样本无法生成评估报告');
    }

    let correct = 0;
    let tp = 0;
    let fp = 0;
    let fn = 0;

    annotations.forEach(ann => {
      const aiSafe = ann.ai_prediction_risk === 'SAFE';
      const gtSafe = ann.ground_truth_risk === 'SAFE';
      if (aiSafe === gtSafe) correct++;
      if (!aiSafe && !gtSafe) tp++;
      if (!aiSafe && gtSafe) fp++;
      if (aiSafe && !gtSafe) fn++;
    });

    const total = annotations.length;
    const accuracy = total > 0 ? correct / total : 0;
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;

    const report = await AuditEvaluationReport.create({
      total_samples: total,
      accuracy_rate: accuracy,
      precision_rate: precision,
      recall_rate: recall,
      f1_score: f1,
    });
    return ok(res, report);
  } catch (error) {
    return fail(res, error.message);
  }
}

async function listEvaluationReports(req, res) {
  try {
    const reports = await AuditEvaluationReport.findAll({
      order: [['report_generated_at', 'DESC']],
      limit: 10,
    });
    return ok(res, reports);
  } catch (error) {
    return fail(res, error.message);
  }
}

module.exports = {
  createAnnotation,
  listAnnotations,
  generateEvaluationReport,
  listEvaluationReports,
};
