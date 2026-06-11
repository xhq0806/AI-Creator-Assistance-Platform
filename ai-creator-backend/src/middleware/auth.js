const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

// Lazy load to avoid circular dependency at module level
function getUserModel() {
  return require('../models').User;
}

async function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

  if (!token) {
    return res.status(401).json({ code: 401, message: '缺少认证 token' });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
  } catch {
    return res.status(401).json({ code: 401, message: '认证已失效' });
  }

  // Check the latest user status and role from DB so stale tokens cannot bypass access changes.
  try {
    const User = getUserModel();
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'status', 'role'],
    });
    if (!user) {
      return res.status(401).json({ code: 401, message: '用户不存在' });
    }
    if (user.status === 'disabled') {
      return res.status(403).json({ code: 403, message: '账号已被禁用，请联系管理员' });
    }
    // Ensure role/status always reflect the latest DB state (backward compat with old tokens).
    req.user.role = user.role || 'user';
    req.user.status = user.status || 'active';
  } catch {
    return res
      .status(503)
      .json({ code: 503, message: '认证服务暂不可用，请稍后重试' });
  }

  return next();
}

async function optionalAuth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

  if (!token) {
    return next();
  }

  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch {
    return next();
  }

  try {
    const User = getUserModel();
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'status', 'role'],
    });
    if (!user || user.status === 'disabled') {
      return next();
    }

    req.user = {
      ...decoded,
      role: user.role || 'user',
      status: user.status || 'active',
    };
  } catch {
    // Optional authentication must never grant access on a stale token. Treat lookup failures as guest access.
    delete req.user;
  }

  return next();
}

module.exports = {
  requireAuth,
  optionalAuth,
};
