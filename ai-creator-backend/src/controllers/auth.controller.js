const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../models');
const { jwtSecret } = require('../config/env');
const { ok } = require('../utils/apiResponse');

function signUser(user) {
  const token = jwt.sign({ id: Number(user.id), username: user.username }, jwtSecret, { expiresIn: '7d' });
  return {
    id: Number(user.id),
    username: user.username,
    phone: user.phone,
    email: user.email,
    token,
  };
}

async function login(req, res, next) {
  try {
    const { account, username, password } = req.body;
    const loginAccount = account || username;
    const user = await User.findOne({
      where: {
        [Op.or]: [{ username: loginAccount }, { phone: loginAccount }, { email: loginAccount }],
      },
    });
    const matched = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!matched) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }

    return ok(res, signUser(user));
  } catch (error) {
    return next(error);
  }
}

async function register(req, res, next) {
  try {
    const { username, password, phone, email } = req.body;
    if (!username || !password || (!phone && !email)) {
      return res.status(400).json({ code: 400, message: '请提供用户名、密码，以及手机号或邮箱' });
    }

    const existed = await User.findOne({
      where: {
        [Op.or]: [{ username }, ...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])],
      },
    });
    if (existed) {
      return res.status(409).json({ code: 409, message: '用户名、手机号或邮箱已被注册' });
    }

    const user = await User.create({
      username,
      phone: phone || null,
      email: email || null,
      password_hash: await bcrypt.hash(password, 10),
    });

    return ok(res, signUser(user));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  register,
};
