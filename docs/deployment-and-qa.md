# 部署与验收说明

## 生产部署建议

### 前端

构建：

```bash
pnpm install
pnpm run build
```

产物位于 `dist/`。可以部署到 Nginx、对象存储静态站点或 CDN。

Nginx 示例：

```nginx
server {
  listen 80;
  server_name your-domain.com;

  root /var/www/aicd-platform/dist;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### 后端

依赖：

- Node.js 18+
- MySQL 8+
- Redis 6+

启动：

```bash
pnpm --dir ai-creator-backend install
pnpm --dir ai-creator-backend start
```

生产环境必须配置：

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=replace-with-a-strong-secret
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=ai_creator
MYSQL_USER=ai_creator
MYSQL_PASSWORD=strong-password
REDIS_URL=redis://127.0.0.1:6379
AI_PROVIDER=modelscope
MODELSCOPE_API_TOKEN=ms-your-token
```

## Smoke E2E 验证

启动 MySQL、Redis、后端和前端后，运行：

```bash
pnpm run smoke:e2e
```

如后端不在默认端口：

```bash
API_BASE_URL=http://localhost:3000 pnpm run smoke:e2e
```

脚本覆盖：

- 健康检查
- 注册登录
- Prompt 模板创建
- 素材创建和基础合规校验
- AI 文本生成
- 发布文章
- 文章详情
- 用户反馈
- 版本记录
- 热榜查询

## LCP 验收流程

目标：爆文发现页首屏 LCP 不超过 2.5 秒。

推荐流程：

1. 执行 `pnpm run build`。
2. 用 Nginx 或静态服务器部署 `dist/`。
3. 准备至少 10 篇已发布文章，其中前 3 篇有可访问封面图。
4. 在 Chrome DevTools Performance 面板或 Lighthouse 中测试 `/index`。
5. 记录 LCP、Total Blocking Time、资源瀑布图。
6. 将结果截图放入答辩材料。

当前代码中的性能优化点：

- Umi granularChunks 拆包。
- 信息流首屏前三张图设置 eager/high priority。
- 后续图片 lazy loading。
- 无限滚动使用 IntersectionObserver。
- `reportLcpMetric` 在控制台输出 LCP 毫秒值。

## 审核准确率验收流程

1. 准备人工标注样本集，至少包含正常、黄赌毒、隐私、虚假营销、边界表达五类。
2. 调用 `/api/v1/ai/audit` 批量评测。
3. 统计 Precision、Recall、F1。
4. 单独统计高危违规 Recall，目标不低于 90%。
5. 将误杀和漏判样本作为下一轮 Prompt 调优依据。
