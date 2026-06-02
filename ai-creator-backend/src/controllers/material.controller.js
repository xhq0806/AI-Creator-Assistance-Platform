const { Material } = require('../models');
const { assessMaterial, auditMaterialContent } = require('../services/material.service');
const { ok } = require('../utils/apiResponse');

function serializeMaterial(material) {
  const payload = material.toJSON ? material.toJSON() : material;
  return {
    ...payload,
    id: Number(payload.id),
    user_id: Number(payload.user_id),
  };
}

async function list(req, res, next) {
  try {
    const { media_type, risk_status } = req.query;
    const where = { user_id: req.user.id };
    if (media_type) where.media_type = media_type;
    if (risk_status) where.risk_status = risk_status;

    const materials = await Material.findAll({
      where,
      order: [['updated_at', 'DESC']],
      limit: 200,
    });

    return ok(res, materials.map(serializeMaterial));
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const { name, url, file_size, mime_type, file_key } = req.body;
    const auditResult = auditMaterialContent({ name, url, mime_type, file_size, file_key });

    if (auditResult.risk_status === 'rejected') {
      return res.status(422).json({
        code: 422,
        message: auditResult.risk_reason,
        data: { risk_level: auditResult.risk_level, risk_category: auditResult.risk_category },
      });
    }

    const material = await Material.create({
      user_id: req.user.id,
      name: String(name || '未命名素材').trim().slice(0, 120),
      url: String(url).trim(),
      media_type: auditResult.media_type,
      file_key: file_key || null,
      file_size: file_size || null,
      mime_type: mime_type || null,
      risk_status: auditResult.risk_status,
      risk_reason: auditResult.risk_reason,
    });

    return ok(res, serializeMaterial(material));
  } catch (error) {
    return next(error);
  }
}

async function audit(req, res, next) {
  try {
    const { id } = req.params;
    const material = await Material.findOne({
      where: { id, user_id: req.user.id },
    });
    if (!material) {
      return res.status(404).json({ code: 404, message: '素材不存在' });
    }

    const auditResult = auditMaterialContent({
      name: material.name,
      url: material.url,
      media_type: material.media_type,
      mime_type: material.mime_type,
      file_size: material.file_size,
      file_key: material.file_key,
    });

    await material.update({
      risk_status: auditResult.risk_status,
      risk_reason: auditResult.risk_reason,
    });

    return ok(res, serializeMaterial(material));
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await Material.destroy({
      where: {
        id: req.params.id,
        user_id: req.user.id,
      },
    });
    if (!deleted) {
      return res.status(404).json({ code: 404, message: '素材不存在或无权删除' });
    }

    return ok(res, { deleted: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
  create,
  audit,
  remove,
};
