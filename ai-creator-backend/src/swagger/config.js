const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AI Creator Platform API",
      version: "1.0.0",
      description: "AI 创作者辅助生产与分发平台后端 API 文档",
    },
    servers: [
      { url: "http://localhost:3000", description: "本地开发" },
      { url: "/api", description: "生产环境（Nginx 反向代理）" },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ApiResponse: {
          type: "object",
          properties: {
            code: { type: "integer", example: 200 },
            data: { type: "object" },
            message: { type: "string" },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "认证接口" },
      { name: "AI", description: "AI 生成与审核" },
      { name: "Articles", description: "文章管理" },
      { name: "Rank", description: "热榜排名" },
      { name: "Prompts", description: "Prompt 模板" },
      { name: "Materials", description: "素材管理" },
      { name: "Upload", description: "文件上传" },
      { name: "Audit", description: "审核标注与评估" },
      { name: "Users", description: "用户管理" },
      { name: "Distribution", description: "内容分发" },
    ],
  },
  apis: ["./src/swagger/*.js"],
};

module.exports = swaggerJsdoc(options);
