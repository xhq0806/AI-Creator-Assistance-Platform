const { Op } = require('sequelize');
const { Material, User } = require('../../models');
const { ok } = require('../../utils/apiResponse');

function serializeMaterial(material) {
  const m = material.toJSON ? material.toJSON() : material;
  return {
    id: Number(m.id),
    user_id: Number(m.user_id),
    name: m.name,
    url: m.url || '',
    file_key: m.file_key || '',
    file_size: m.file_size || 0,
    mime_type: m.mime_type || '',
    media_type: m.media_type || 'image',
    risk_status: m.risk_status || 'approved',
    risk_reason: m.risk_reason || '',
    upload_status: m.upload_status || 'done',
    created_at: m.created_at,
    updated_at: m.updated_at,
    owner: m.User ? { id: Number(m.User.id), username: m.User.username } : null,
  };
}

async function listAllMaterials(req, res, next) {
  try {
    const { page = 1, pageSize = 20, userId, riskStatus } = req.query;
    const where = {};

    if (userId) where.user_id = Number(userId);
    if (riskStatus) where.risk_status = riskStatus;

    const offset = (Number(page) - 1) * Number(pageSize);
    const { rows, count } = await Material.findAndCountAll({
      where,
      include: [{ model: User, attributes: ['id', 'username'] }],
      order: [['created_at', 'DESC']],
      limit: Number(pageSize),
      offset,
    });

    return ok(res, {
      list: rows.map(serializeMaterial),
      total: count,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    return next(error);
  }
}

async function overrideRisk(req, res, next) {
  try {
    const material = await Material.findByPk(req.params.id);
    if (!material) {
      return res.status(404).json({ code: 404, message: '素材不存在' });
    }

    const { riskStatus, reason = '' } = req.body;
    await material.update({
      risk_status: riskStatus,
      risk_reason: reason || `管理员手动${riskStatus === 'approved' ? '通过' : '拒绝'}`,
    });

    return ok(res, serializeMaterial(material));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listAllMaterials,
  overrideRisk,
};
