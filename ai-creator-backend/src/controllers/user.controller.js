const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { Article, User, UserFeedback } = require("../models");
const { serializeArticle } = require("./article.controller");
const { ok } = require("../utils/apiResponse");

function serializeUser(user) {
  return {
    id: Number(user.id),
    username: user.username,
    phone: user.phone,
    email: user.email,
  };
}

async function profile(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ code: 404, message: "用户不存在" });
    }
    return ok(res, serializeUser(user));
  } catch (error) {
    return next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ code: 404, message: "用户不存在" });
    }

    const username = String(req.body.username || user.username).trim();
    const phone =
      req.body.phone === undefined
        ? user.phone
        : String(req.body.phone || "").trim() || null;
    const email =
      req.body.email === undefined
        ? user.email
        : String(req.body.email || "").trim() || null;

    if (!username) {
      return res.status(400).json({ code: 400, message: "昵称不能为空" });
    }

    const existed = await User.findOne({
      where: {
        id: { [Op.ne]: user.id },
        [Op.or]: [
          { username },
          ...(phone ? [{ phone }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
    });
    if (existed) {
      return res
        .status(409)
        .json({ code: 409, message: "昵称、手机号或邮箱已被占用" });
    }

    await user.update({ username, phone, email });
    return ok(res, serializeUser(user));
  } catch (error) {
    return next(error);
  }
}

async function myArticles(req, res, next) {
  try {
    const articles = await Article.findAll({
      where: { user_id: req.user.id },
      include: [{ model: User, attributes: ["id", "username"] }],
      order: [["updated_at", "DESC"]],
      limit: 100,
    });
    return ok(res, articles.map(serializeArticle));
  } catch (error) {
    return next(error);
  }
}

async function myFeedbackArticles(req, res, next) {
  try {
    const type = req.params.type;
    if (!["like", "favorite"].includes(type)) {
      return res.status(400).json({ code: 400, message: "反馈类型不支持" });
    }

    const feedbacks = await UserFeedback.findAll({
      where: { user_id: req.user.id, type },
      include: [
        {
          model: Article,
          include: [{ model: User, attributes: ["id", "username"] }],
        },
      ],
      order: [["updated_at", "DESC"]],
      limit: 100,
    });
    const articles = feedbacks.map((item) => item.Article).filter(Boolean);
    return ok(res, articles.map(serializeArticle));
  } catch (error) {
    return next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ code: 404, message: "用户不存在" });
    }

    const matched = await bcrypt.compare(
      req.body.oldPassword,
      user.password_hash
    );
    if (!matched) {
      return res.status(403).json({ code: 403, message: "旧密码错误" });
    }

    user.password_hash = await bcrypt.hash(req.body.newPassword, 10);
    await user.save();

    return ok(res, { message: "密码已更新" });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  profile,
  updateProfile,
  myArticles,
  myFeedbackArticles,
  changePassword,
};
