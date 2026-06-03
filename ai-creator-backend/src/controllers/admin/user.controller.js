const { Op } = require('sequelize');
const { User, Article } = require('../../models');
const { ok } = require('../../utils/apiResponse');

function serializeUser(user) {
  const payload = user.toJSON ? user.toJSON() : user;
  return {
    id: Number(payload.id),
    username: payload.username,
    phone: payload.phone || '',
    email: payload.email || '',
    role: payload.role || 'user',
    status: payload.status || 'active',
    created_at: payload.created_at,
    updated_at: payload.updated_at,
  };
}

async function getUserStats(req, res, next) {
  try {
    const [total, byRole, byStatus] = await Promise.all([
      User.count(),
      Promise.all([
        User.count({ where: { role: 'user' } }),
        User.count({ where: { role: 'editor' } }),
        User.count({ where: { role: 'admin' } }),
      ]),
      Promise.all([
        User.count({ where: { status: 'active' } }),
        User.count({ where: { status: 'disabled' } }),
      ]),
    ]);

    return ok(res, {
      total,
      byRole: { user: byRole[0], editor: byRole[1], admin: byRole[2] },
      byStatus: { active: byStatus[0], disabled: byStatus[1] },
    });
  } catch (error) {
    return next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const { page = 1, pageSize = 20, search = '', role, status } = req.query;
    const where = {};

    if (search) {
      where[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;

    const offset = (Number(page) - 1) * Number(pageSize);
    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']],
      limit: Number(pageSize),
      offset,
    });

    return ok(res, {
      list: rows.map(serializeUser),
      total: count,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    return next(error);
  }
}

async function getUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
    });
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    const articleCount = await Article.count({ where: { user_id: user.id } });

    return ok(res, { ...serializeUser(user), articleCount });
  } catch (error) {
    return next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    const { role, status, phone, email } = req.body;
    const updates = {};
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;

    await user.update(updates);
    return ok(res, serializeUser(user));
  } catch (error) {
    return next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ code: 400, message: '不能禁用自己的账号' });
    }

    await user.update({ status: 'disabled' });
    return ok(res, { message: '用户已禁用' });
  } catch (error) {
    return next(error);
  }
}

async function getUserArticles(req, res, next) {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const { rows, count } = await Article.findAndCountAll({
      where: { user_id: req.params.id },
      order: [['created_at', 'DESC']],
      limit: Number(pageSize),
      offset,
    });

    return ok(res, {
      list: rows.map((a) => ({
        id: Number(a.id),
        title: a.title,
        status: a.status,
        category: a.category,
        quality_score: Number(a.quality_score || 0),
        created_at: a.created_at,
      })),
      total: count,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getUserStats,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserArticles,
};
