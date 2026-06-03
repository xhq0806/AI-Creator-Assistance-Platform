const { Op } = require('sequelize');
const { PromptTemplate, User } = require('../../models');
const { ok } = require('../../utils/apiResponse');

function serializePrompt(prompt) {
  const p = prompt.toJSON ? prompt.toJSON() : prompt;
  return {
    id: Number(p.id),
    user_id: p.user_id ? Number(p.user_id) : null,
    team_id: p.team_id ? Number(p.team_id) : null,
    name: p.name,
    category: p.category || '通用',
    content: p.content,
    visibility: p.visibility || 'private',
    usage_count: Number(p.usage_count || 0),
    created_at: p.created_at,
    updated_at: p.updated_at,
    owner: p.User ? { id: Number(p.User.id), username: p.User.username } : null,
  };
}

async function listAllPrompts(req, res, next) {
  try {
    const { page = 1, pageSize = 20, search, visibility, userId } = req.query;
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
      ];
    }
    if (visibility) where.visibility = visibility;
    if (userId) where.user_id = Number(userId);

    const offset = (Number(page) - 1) * Number(pageSize);
    const { rows, count } = await PromptTemplate.findAndCountAll({
      where,
      include: [{ model: User, attributes: ['id', 'username'] }],
      order: [['created_at', 'DESC']],
      limit: Number(pageSize),
      offset,
    });

    return ok(res, {
      list: rows.map(serializePrompt),
      total: count,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    return next(error);
  }
}

async function createSystemPrompt(req, res, next) {
  try {
    const { name, category = '通用', content, visibility = 'system_public' } = req.body;

    const prompt = await PromptTemplate.create({
      user_id: null,
      team_id: null,
      name,
      category,
      content,
      visibility,
    });

    return ok(res, serializePrompt(prompt));
  } catch (error) {
    return next(error);
  }
}

async function updateAnyPrompt(req, res, next) {
  try {
    const prompt = await PromptTemplate.findByPk(req.params.id);
    if (!prompt) {
      return res.status(404).json({ code: 404, message: 'Prompt 模板不存在' });
    }

    const { name, category, content, visibility } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (content !== undefined) updates.content = content;
    if (visibility !== undefined) updates.visibility = visibility;

    await prompt.update(updates);

    const updated = await PromptTemplate.findByPk(prompt.id, {
      include: [{ model: User, attributes: ['id', 'username'] }],
    });

    return ok(res, serializePrompt(updated));
  } catch (error) {
    return next(error);
  }
}

async function deleteAnyPrompt(req, res, next) {
  try {
    const prompt = await PromptTemplate.findByPk(req.params.id);
    if (!prompt) {
      return res.status(404).json({ code: 404, message: 'Prompt 模板不存在' });
    }

    await prompt.destroy();
    return ok(res, { message: 'Prompt 模板已删除' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listAllPrompts,
  createSystemPrompt,
  updateAnyPrompt,
  deleteAnyPrompt,
};
