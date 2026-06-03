const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { User } = require("../models");
const { jwtSecret, jwtRefreshSecret } = require("../config/env");
const { ok } = require("../utils/apiResponse");

function signTokens(user) {
  const payload = { id: Number(user.id), username: user.username, role: user.role || 'user' };
  const token = jwt.sign(payload, jwtSecret, { expiresIn: "1h" });
  const refreshToken = jwt.sign(payload, jwtRefreshSecret, { expiresIn: "7d" });
  return {
    id: Number(user.id),
    username: user.username,
    phone: user.phone,
    email: user.email,
    role: user.role || 'user',
    status: user.status || 'active',
    token,
    refreshToken,
  };
}

async function login(req, res, next) {
  try {
    const { account, username, password } = req.body;
    const loginAccount = account || username;
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: loginAccount },
          { phone: loginAccount },
          { email: loginAccount },
        ],
      },
    });
    const matched = user
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!matched) {
      return res.status(401).json({ code: 401, message: "用户名或密码错误" });
    }

    // Check if user is disabled
    if (user.status === 'disabled') {
      return res.status(403).json({ code: 403, message: '账号已被禁用，请联系管理员' });
    }

    return ok(res, signTokens(user));
  } catch (error) {
    return next(error);
  }
}

async function register(req, res, next) {
  try {
    const { username, password, phone, email } = req.body;
    if (!username || !password || (!phone && !email)) {
      return res
        .status(400)
        .json({ code: 400, message: "请提供用户名、密码，以及手机号或邮箱" });
    }

    const existed = await User.findOne({
      where: {
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
        .json({ code: 409, message: "用户名、手机号或邮箱已被注册" });
    }

    const user = await User.create({
      username,
      phone: phone || null,
      email: email || null,
      password_hash: await bcrypt.hash(password, 10),
    });

    return ok(res, signTokens(user));
  } catch (error) {
    return next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ code: 400, message: "缺少 refresh token" });
    }

    const decoded = jwt.verify(refreshToken, jwtRefreshSecret);
    const user = await User.findByPk(decoded.id, {
      attributes: ["id", "username", "phone", "email"],
    });
    if (!user) {
      return res.status(401).json({ code: 401, message: "用户不存在" });
    }

    return ok(res, signTokens(user));
  } catch {
    return res
      .status(401)
      .json({ code: 401, message: "refresh token 已失效，请重新登录" });
  }
}

module.exports = {
  login,
  register,
  refresh,
};
