const { Op } = require('sequelize');
const { AuditManualAnnotation, AuditEvaluationReport, User, Article } = require('../../models');
const { ok } = require('../../utils/apiResponse');

async function listAllAnnotations(req, res, next) {
  try {
    const { page = 1, pageSize = 20, riskCategory, riskLevel } = req.query;
    const where = {};

    if (riskCategory) where.risk_category = riskCategory;
    if (riskLevel) where.ground_truth_risk = riskLevel;

    const offset = (Number(page) - 1) * Number(pageSize);
    const { rows, count } = await AuditManualAnnotation.findAndCountAll({
      where,
      include: [
        { model: User, attributes: ['id', 'username'], as: 'annotator' },
        { model: Article, attributes: ['id', 'title'] },
      ],
      order: [['created_at', 'DESC']],
      limit: Number(pageSize),
      offset,
    });

    return ok(res, {
      list: rows.map((a) => {
        const ann = a.toJSON();
        return {
          id: Number(ann.id),
          article_id: ann.article_id ? Number(ann.article_id) : null,
          title: ann.title,
          content: ann.content,
          ai_prediction_risk: ann.ai_prediction_risk,
          ground_truth_risk: ann.ground_truth_risk,
          risk_category: ann.risk_category,
          annotation_note: ann.annotation_note || '',
          annotator: ann.User ? { id: Number(ann.User.id), username: ann.User.username } : null,
          article: ann.Article ? { id: Number(ann.Article.id), title: ann.Article.title } : null,
          annotated_at: ann.annotated_at || ann.created_at,
        };
      }),
      total: count,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    return next(error);
  }
}

async function listAllReports(req, res, next) {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const { rows, count } = await AuditEvaluationReport.findAndCountAll({
      order: [['created_at', 'DESC']],
      limit: Number(pageSize),
      offset,
      include: [{ model: User, attributes: ['id', 'username'] }],
    });

    return ok(res, {
      list: rows.map((r) => {
        const report = r.toJSON();
        return {
          id: Number(report.id),
          user_id: report.user_id ? Number(report.user_id) : null,
          total_samples: report.total_samples,
          accuracy: report.accuracy_rate != null ? Number(report.accuracy_rate) : null,
          precision: report.precision_rate != null ? Number(report.precision_rate) : null,
          recall: report.recall_rate != null ? Number(report.recall_rate) : null,
          f1_score: report.f1_score != null ? Number(report.f1_score) : null,
          per_risk_level_metrics: report.per_risk_level_metrics || {},
          per_category_metrics: report.per_category_metrics || {},
          confusion_matrix: report.confusion_matrix || {},
          created_at: report.created_at,
          user: report.User ? { id: Number(report.User.id), username: report.User.username } : null,
        };
      }),
      total: count,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteReport(req, res, next) {
  try {
    const report = await AuditEvaluationReport.findByPk(req.params.id);
    if (!report) {
      return res.status(404).json({ code: 404, message: '报告不存在' });
    }

    await report.destroy();
    return ok(res, { message: '评估报告已删除' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listAllAnnotations,
  listAllReports,
  deleteReport,
};
