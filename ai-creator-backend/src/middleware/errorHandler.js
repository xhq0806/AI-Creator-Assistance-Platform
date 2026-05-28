function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  console.error('[api-error]', error);
  return res.status(error.status || 500).json({
    code: error.status || 500,
    message: error.message || '服务异常',
  });
}

module.exports = errorHandler;
