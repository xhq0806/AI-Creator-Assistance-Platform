const { Op } = require('sequelize');
const { PromptTemplate } = require('../models');
const { ok } = require('../utils/apiResponse');

function serializePrompt(prompt) {
  const payload = prompt.toJSON ? prompt.toJSON() : prompt;
  return {
    ...payload,
    id: Number(payload.id),
    user_id: payload.user_id ? Number(payload.user_id) : null,
  };
}

async function list(req, res, next) {
  try {
    const prompts = await PromptTemplate.findAll({
      where: {
        [Op.or]: [{ user_id: null }, { user_id: req.user.id }],
      },
      order: [
        ['user_id', 'ASC'],
        ['usage_count', 'DESC'],
        ['updated_at', 'DESC'],
      ],
    });

    return ok(res, prompts.map(serializePrompt));
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const { name, category = '通用', content } = req.body;
    if (!name || !content) {
      return res.status(400).json({ code: 400, message: '请提供模板名称和内容' });
    }

    const prompt = await PromptTemplate.create({
      user_id: req.user.id,
      name: String(name).trim().slice(0, 80),
      category: String(category || '通用').trim().slice(0, 40),
      content: String(content).trim(),
    });

    return ok(res, serializePrompt(prompt));
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const prompt = await PromptTemplate.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!prompt) {
      return res.status(404).json({ code: 404, message: '模板不存在或无权修改' });
    }

    const { name, category, content } = req.body;
    await prompt.update({
      ...(name ? { name: String(name).trim().slice(0, 80) } : {}),
      ...(category ? { category: String(category).trim().slice(0, 40) } : {}),
      ...(content ? { content: String(content).trim() } : {}),
    });

    return ok(res, serializePrompt(prompt));
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await PromptTemplate.destroy({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!deleted) {
      return res.status(404).json({ code: 404, message: '模板不存在或无权删除' });
    }

    return ok(res, { deleted: true });
  } catch (error) {
    return next(error);
  }
}

async function markUsed(req, res, next) {
  try {
    const prompt = await PromptTemplate.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [{ user_id: null }, { user_id: req.user.id }],
      },
    });
    if (!prompt) {
      return res.status(404).json({ code: 404, message: '模板不存在' });
    }

    await prompt.increment('usage_count', { by: 1 });
    await prompt.reload();

    return ok(res, serializePrompt(prompt));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
  create,
  update,
  remove,
  markUsed,
};
