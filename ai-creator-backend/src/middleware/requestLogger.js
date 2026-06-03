const { childLogger } = require("../utils/logger");

/**
 * Structured request logging middleware.
 * Uses winston child logger attached by requestId middleware,
 * with fallback for cases where requestId is missing.
 */
function requestLogger() {
  return (req, res, next) => {
    const log = req.log || childLogger("no-req-id");
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      const level =
        res.statusCode >= 500
          ? "error"
          : res.statusCode >= 400
          ? "warn"
          : "info";

      log.log(level, `${req.method} ${req.originalUrl}`, {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        userAgent: (req.headers["user-agent"] || "").slice(0, 120),
        ip: req.ip,
      });
    });

    next();
  };
}

module.exports = requestLogger;
