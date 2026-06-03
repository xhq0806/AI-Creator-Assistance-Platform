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

  // Check if user is disabled
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
    // Ensure role is always set on req.user (backward compat with old tokens)
    req.user.role = user.role || 'user';
  } catch {
    // If DB check fails, allow through with token claims (degraded mode)
    req.user.role = req.user.role || 'user';
  }

  return next();
}

module.exports = {
  requireAuth,
};
