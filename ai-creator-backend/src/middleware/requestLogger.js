function requestLogger() {
  return (req, res, next) => {
    const start = Date.now();
    const method = req.method;
    const url = req.originalUrl || req.url;

    res.on("finish", () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const contentLength = res.get("content-length") || "-";

      if (status >= 400 || url.startsWith("/api/v1/ai/")) {
        console.log(
          `[${new Date().toISOString()}] ${method} ${url} ${status} ${duration}ms ${contentLength}`
        );
      }
    });

    next();
  };
}

module.exports = requestLogger;
