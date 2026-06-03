const winston = require("winston");
const { isProduction } = require("../config/env");

const devFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.colorize(),
  winston.format.printf(
    ({ timestamp, level, message, requestId, ...meta }) => {
      const rid = requestId ? ` [${requestId.slice(0, 8)}]` : "";
      const extra = Object.keys(meta).length
        ? " " + JSON.stringify(meta)
        : "";
      return `${timestamp} ${level}${rid} ${message}${extra}`;
    }
  )
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  format: isProduction ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

// Create a child logger with requestId bound
function childLogger(requestId) {
  return logger.child({ requestId });
}

module.exports = { logger, childLogger };
