const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

/**
 * Require admin role — only 'admin' can access.
 * Must be used AFTER requireAuth (which sets req.user.role).
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ code: 403, message: '权限不足，仅限管理员操作' });
  }
  return next();
}

/**
 * Require staff role — 'admin' or 'editor' can access.
 * Must be used AFTER requireAuth (which sets req.user.role).
 */
function requireStaff(req, res, next) {
  if (!req.user || !['admin', 'editor'].includes(req.user.role)) {
    return res.status(403).json({ code: 403, message: '权限不足，仅限管理员或编辑操作' });
  }
  return next();
}

module.exports = {
  requireAdmin,
  requireStaff,
};
