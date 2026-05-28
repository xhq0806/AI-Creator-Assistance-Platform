const { Material } = require('../models');
const { assessMaterial } = require('../services/material.service');
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
    const materials = await Material.findAll({
      where: { user_id: req.user.id },
      order: [['updated_at', 'DESC']],
      limit: 100,
    });

    return ok(res, materials.map(serializeMaterial));
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const { name, url } = req.body;
    const assessment = assessMaterial({ name, url });
    if (!assessment.valid) {
      return res.status(422).json({ code: 422, message: assessment.reason });
    }

    const material = await Material.create({
      user_id: req.user.id,
      name: String(name || '未命名素材').trim().slice(0, 120),
      url: String(url).trim(),
      media_type: assessment.mediaType,
      risk_status: 'approved',
      risk_reason: assessment.reason,
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
  remove,
};
