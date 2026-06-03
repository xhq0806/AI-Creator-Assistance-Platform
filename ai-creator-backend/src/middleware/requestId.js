const { v4: uuidv4 } = require("uuid");
const { childLogger } = require("../utils/logger");

/**
 * Attaches a unique requestId to each request and makes it available via:
 *   - req.requestId
 *   - res header X-Request-Id
 *   - req.log (child logger with requestId bound)
 */
function requestIdMiddleware(req, res, next) {
  const requestId = (req.headers["x-request-id"] || uuidv4()).slice(0, 36);
  req.requestId = requestId;
  req.log = childLogger(requestId);
  res.setHeader("X-Request-Id", requestId);
  next();
}

module.exports = requestIdMiddleware;
