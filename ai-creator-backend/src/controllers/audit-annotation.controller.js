const { AuditManualAnnotation, AuditEvaluationReport, AuditLog, Article, User } = require('../models');
const { ok, fail } = require('../utils/apiResponse');
const sequelize = require('../config/database');

const RISK_LEVELS = ['SAFE', 'RISK_LOW', 'RISK_MEDIUM', 'RISK_HIGH'];
const RISK_CATEGORIES = ['NONE', 'PORN', 'GAMBLING', 'DRUG', 'POLITICAL', 'VIOLENCE_TERROR', 'PRIVACY', 'MINOR_RISK', 'FAKE_MARKETING', 'OTHER'];

const SEED_SAMPLES = [
  { title: '今日天气晴朗适合出游', content: '今天天气非常好，阳光明媚，温度适宜，非常适合户外活动和郊游。', ai_prediction_risk: 'SAFE', ground_truth_risk: 'SAFE', risk_category: 'NONE', times: 3 },
  { title: 'Python编程入门教程', content: '本文介绍Python基础语法，包括变量定义、循环结构、函数编写等内容。', ai_prediction_risk: 'SAFE', ground_truth_risk: 'SAFE', risk_category: 'NONE', times: 3 },
  { title: '某明星大胆写真流出', content: '该明星拍摄了一组大胆写真，尺度极大，引发网友热议和疯狂转发。', ai_prediction_risk: 'RISK_HIGH', ground_truth_risk: 'RISK_HIGH', risk_category: 'PORN', times: 2 },
  { title: '午夜约炮神器推荐', content: '推荐几个好用的一夜情交友软件，成功率极高，保证让你满意。', ai_prediction_risk: 'RISK_HIGH', ground_truth_risk: 'RISK_HIGH', risk_category: 'PORN', times: 2 },
  { title: '性感内衣选购指南', content: '如何挑选适合自己的性感内衣，不同身材的女生应该怎么选。', ai_prediction_risk: 'RISK_LOW', ground_truth_risk: 'SAFE', risk_category: 'NONE', times: 2 },
  { title: '在线博彩稳赚技巧', content: '分享一套稳赚不赔的博彩下注策略，跟着做保证月入过万。', ai_prediction_risk: 'RISK_HIGH', ground_truth_risk: 'RISK_HIGH', risk_category: 'GAMBLING', times: 2 },
  { title: '麻将游戏下载推荐', content: '推荐几款好玩的麻将游戏APP，可以和好友一起在线对战。', ai_prediction_risk: 'SAFE', ground_truth_risk: 'RISK_LOW', risk_category: 'GAMBLING', times: 2 },
  { title: '新型毒品体验分享', content: '最近在圈子里流行一种新型毒品，据说效果很好没有副作用。', ai_prediction_risk: 'RISK_HIGH', ground_truth_risk: 'RISK_HIGH', risk_category: 'DRUG', times: 2 },
  { title: '感冒药选购指南', content: '换季感冒多发，推荐几种常用的感冒药及其适用症状说明。', ai_prediction_risk: 'SAFE', ground_truth_risk: 'SAFE', risk_category: 'NONE', times: 2 },
  { title: '某敏感事件真相揭秘', content: '关于最近那个大家都知道的敏感事件，我来告诉你背后的真相。', ai_prediction_risk: 'RISK_MEDIUM', ground_truth_risk: 'RISK_MEDIUM', risk_category: 'POLITICAL', times: 2 },
  { title: '国际形势深度分析', content: '从经济政治多角度分析当前国际形势及未来发展趋势。', ai_prediction_risk: 'RISK_LOW', ground_truth_risk: 'SAFE', risk_category: 'NONE', times: 2 },
  { title: '暴力冲突视频曝光', content: '某地发生严重的暴力冲突事件，场面极其血腥恐怖。', ai_prediction_risk: 'RISK_HIGH', ground_truth_risk: 'RISK_HIGH', risk_category: 'VIOLENCE_TERROR', times: 2 },
  { title: '某明星身份证号曝光', content: '据可靠消息，某当红明星的身份证号、住址和电话号码已遭泄露。', ai_prediction_risk: 'RISK_HIGH', ground_truth_risk: 'RISK_HIGH', risk_category: 'PRIVACY', times: 2 },
  { title: '未成年人社交风险警示', content: '近期发生多起未成年人被诱导参与危险活动的案例，家长需警惕。', ai_prediction_risk: 'RISK_MEDIUM', ground_truth_risk: 'RISK_MEDIUM', risk_category: 'MINOR_RISK', times: 2 },
  { title: '某保健品夸大宣传', content: '这款神奇的保健品能治百病延年益寿，专家都说效果惊人。', ai_prediction_risk: 'RISK_MEDIUM', ground_truth_risk: 'RISK_MEDIUM', risk_category: 'FAKE_MARKETING', times: 2 },
  { title: '健康养生小知识', content: '每天坚持喝温水早上空腹一杯对身体好，这是科学的养生方法。', ai_prediction_risk: 'SAFE', ground_truth_risk: 'SAFE', risk_category: 'NONE', times: 3 },
  { title: '高考志愿填报攻略', content: '根据历年分数线分析，给出几个热门专业的志愿填报建议。', ai_prediction_risk: 'SAFE', ground_truth_risk: 'SAFE', risk_category: 'NONE', times: 3 },
  { title: '两人暧昧聊天记录曝光', content: '某网红与异性暧昧聊天记录被曝光，内容露骨尺度很大。', ai_prediction_risk: 'RISK_HIGH', ground_truth_risk: 'RISK_MEDIUM', risk_category: 'PORN', times: 2 },
  { title: '彩票中奖号码预测', content: '根据大数据分析，下期彩票中奖号码很有可能是这几个数字。', ai_prediction_risk: 'RISK_LOW', ground_truth_risk: 'RISK_LOW', risk_category: 'GAMBLING', times: 2 },
  { title: '手机号码泄露查询', content: '输入手机号即可查询机主姓名、身份证号和家庭住址。', ai_prediction_risk: 'RISK_HIGH', ground_truth_risk: 'RISK_HIGH', risk_category: 'PRIVACY', times: 2 },
];

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
    const { risk_category, page = 1, pageSize = 50 } = req.query;
    const where = {};
    if (risk_category) {
      where.risk_category = risk_category;
    }
    const offset = (Math.max(1, Number(page)) - 1) * Math.min(100, Number(pageSize));
    const { count, rows } = await AuditManualAnnotation.findAndCountAll({
      where,
      include: [{ model: User, as: 'annotator', attributes: ['id', 'username'] }],
      order: [['created_at', 'DESC']],
      limit: Math.min(100, Number(pageSize)),
      offset,
    });
    return ok(res, { total: count, list: rows });
  } catch (error) {
    return fail(res, error.message);
  }
}

async function deleteAnnotation(req, res) {
  try {
    const deleted = await AuditManualAnnotation.destroy({
      where: { id: req.params.id },
    });
    if (!deleted) {
      return res.status(404).json({ code: 404, message: '标注记录不存在' });
    }
    return ok(res, { deleted: true });
  } catch (error) {
    return fail(res, error.message);
  }
}

async function seedSamples(req, res) {
  try {
    const { clear_existing } = req.body;
    if (clear_existing) {
      await AuditManualAnnotation.destroy({ where: {}, truncate: true });
    }

    const created = [];
    for (const sample of SEED_SAMPLES) {
      for (let i = 0; i < sample.times; i++) {
        const variant = i > 0 ? ` （变体${i}）` : '';
        created.push({
          title: sample.title + variant,
          content: sample.content + variant,
          ai_prediction_risk: sample.ai_prediction_risk,
          ground_truth_risk: sample.ground_truth_risk,
          risk_category: sample.risk_category,
          annotator_id: req.user?.id || null,
          annotated_at: new Date(),
        });
      }
    }

    const annotations = await AuditManualAnnotation.bulkCreate(created);
    return ok(res, { created: annotations.length });
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

    const total = annotations.length;

    let correct = 0;
    let tp = 0;
    let fp = 0;
    let fn = 0;

    const confusionMatrix = {};
    for (const level of RISK_LEVELS) {
      confusionMatrix[level] = {};
      for (const levelB of RISK_LEVELS) {
        confusionMatrix[level][levelB] = 0;
      }
    }

    const categoryStats = {};
    const riskLevelStats = {};

    for (const level of RISK_LEVELS) {
      riskLevelStats[level] = { total: 0, correct: 0, tp: 0, fp: 0, fn: 0 };
    }

    annotations.forEach((ann) => {
      const aiSafe = ann.ai_prediction_risk === 'SAFE';
      const gtSafe = ann.ground_truth_risk === 'SAFE';
      if (aiSafe === gtSafe) correct++;
      if (!aiSafe && !gtSafe) tp++;
      if (!aiSafe && gtSafe) fp++;
      if (aiSafe && !gtSafe) fn++;

      confusionMatrix[ann.ground_truth_risk][ann.ai_prediction_risk] =
        (confusionMatrix[ann.ground_truth_risk]?.[ann.ai_prediction_risk] || 0) + 1;

      if (!categoryStats[ann.risk_category]) {
        categoryStats[ann.risk_category] = { total: 0, correct: 0, tp: 0, fp: 0, fn: 0 };
      }
      const cs = categoryStats[ann.risk_category];
      cs.total++;
      if (aiSafe === gtSafe) cs.correct++;
      if (!aiSafe && !gtSafe) cs.tp++;
      if (!aiSafe && gtSafe) cs.fp++;
      if (aiSafe && !gtSafe) cs.fn++;

      const rs = riskLevelStats[ann.ground_truth_risk];
      if (rs) {
        rs.total++;
        if (ann.ai_prediction_risk === ann.ground_truth_risk) rs.correct++;
        if (ann.ai_prediction_risk !== 'SAFE' && ann.ground_truth_risk !== 'SAFE') rs.tp++;
        if (ann.ai_prediction_risk !== 'SAFE' && ann.ground_truth_risk === 'SAFE') rs.fp++;
        if (ann.ai_prediction_risk === 'SAFE' && ann.ground_truth_risk !== 'SAFE') rs.fn++;
      }
    });

    function calcMetrics(tpVal, fpVal, fnVal, correctVal, totalVal) {
      const accuracy = totalVal > 0 ? correctVal / totalVal : 0;
      const precision = (tpVal + fpVal) > 0 ? tpVal / (tpVal + fpVal) : 0;
      const recall = (tpVal + fnVal) > 0 ? tpVal / (tpVal + fnVal) : 0;
      const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;
      return { accuracy: +accuracy.toFixed(6), precision: +precision.toFixed(6), recall: +recall.toFixed(6), f1: +f1.toFixed(6), total: totalVal };
    }

    const perCategoryMetrics = {};
    for (const [cat, cs] of Object.entries(categoryStats)) {
      perCategoryMetrics[cat] = calcMetrics(cs.tp, cs.fp, cs.fn, cs.correct, cs.total);
    }

    const perRiskLevelMetrics = {};
    for (const [level, rs] of Object.entries(riskLevelStats)) {
      perRiskLevelMetrics[level] = calcMetrics(rs.tp, rs.fp, rs.fn, rs.correct, rs.total);
    }

    const accuracy = total > 0 ? correct / total : 0;
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;

    const report = await AuditEvaluationReport.create({
      user_id: req.user?.id || null,
      total_samples: total,
      accuracy_rate: accuracy,
      precision_rate: precision,
      recall_rate: recall,
      f1_score: f1,
      per_category_metrics: perCategoryMetrics,
      per_risk_level_metrics: perRiskLevelMetrics,
      confusion_matrix: confusionMatrix,
    });
    return ok(res, report);
  } catch (error) {
    return fail(res, error.message);
  }
}

async function listEvaluationReports(req, res) {
  try {
    const reports = await AuditEvaluationReport.findAll({
      order: [['created_at', 'DESC']],
      limit: 20,
    });
    return ok(res, reports);
  } catch (error) {
    return fail(res, error.message);
  }
}

async function getReportDetail(req, res) {
  try {
    const report = await AuditEvaluationReport.findByPk(req.params.id);
    if (!report) {
      return res.status(404).json({ code: 404, message: '报告不存在' });
    }
    return ok(res, report);
  } catch (error) {
    return fail(res, error.message);
  }
}

module.exports = {
  createAnnotation,
  listAnnotations,
  deleteAnnotation,
  seedSamples,
  generateEvaluationReport,
  listEvaluationReports,
  getReportDetail,
};
