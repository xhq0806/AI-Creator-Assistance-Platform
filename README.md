# AI 创作者辅助生产与分发平台

面向个人创作者和中小内容团队的 AIGC 创作工作台。平台覆盖账号体系、AI 图文生成、素材管理、内容安全审核、质量评分、草稿自动保存、离线恢复、发布后二次编辑、热榜信息流和模拟分发，形成从创作到消费的闭环。

## 功能完成度

- 用户中心：支持用户名、手机号、邮箱登录注册，JWT 认证和安全退出。
- AI 创作：支持提示词模板管理、素材库管理、图文内容生成、AI 配图生成。
- 内容审核：发布前自动审核，风险内容驳回；编辑器侧支持一键应用合规替代文本。
- 质量评分：支持编辑过程手动评分，发布时自动评分，质量分参与热榜排序。
- 草稿体系：在线 30 秒自动保存；离线写作落 IndexedDB；网络恢复后增量同步并回写服务端 ID。
- 版本管理：每次保存、发布、离线同步、撤回和回滚都会生成版本记录，作者可回滚为草稿。
- 内容治理：已发布内容支持撤回，读者反馈会进入热榜排序。
- 内容消费：爆文发现页、文章详情页、阅读量统计、作者信息和质量分展示。
- 分发场景：模拟同步到今日头条、抖音，并返回平台侧内容 ID。

## 技术栈

- 前端：React 18、TypeScript、Umi 4、Ant Design、localForage。
- 后端：Node.js、Express 5、Sequelize、JWT、bcryptjs。
- 数据：MySQL 存储用户、文章、审核日志；Redis 支撑 AI 限流、文章热榜和文章缓存。
- AI：OpenAI-compatible SDK，可接 ModelScope 或火山方舟；未配置密钥时使用本地降级结果保障演示可运行。

## 目录结构

```text
AICD_Platform/
  src/                         前端应用
    pages/creator/             AI 创作工作台
    pages/index/               爆文发现信息流
    pages/article/             文章详情与二次编辑入口
    pages/login/               登录注册
    services/api.ts            前端 API 封装
    utils/offlineDraft.ts      IndexedDB 离线草稿队列
  ai-creator-backend/          Express API 服务
    src/controllers/           路由控制器
    src/services/              AI、热榜、分发业务逻辑
    src/models/                Sequelize 模型
    src/config/schema.sql      MySQL 表结构
  scripts/smoke-e2e.js         端到端冒烟验证脚本
  docs/                        架构、规则、评估与交付文档
```

## 本地运行

### 1. 安装依赖

```bash
pnpm install
pnpm --dir ai-creator-backend install
```

### 2. 准备基础服务

需要本地 MySQL 和 Redis。先创建数据库：

```sql
CREATE DATABASE IF NOT EXISTS ai_creator DEFAULT CHARACTER SET utf8mb4;
```

后端启动时会通过 Sequelize 自动同步模型，并创建默认账号：

```text
admin / admin123
```

### 3. 配置环境变量

复制后端环境模板：

```bash
cp ai-creator-backend/.env.example ai-creator-backend/.env
```

关键配置：

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=ai_creator
MYSQL_USER=root
MYSQL_PASSWORD=
REDIS_URL=redis://127.0.0.1:6379

AI_PROVIDER=modelscope
MODELSCOPE_API_TOKEN=
MODELSCOPE_BASE_URL=https://api-inference.modelscope.cn/v1
MODELSCOPE_TEXT_MODEL=Qwen/Qwen3-235B-A22B-Instruct-2507
```

`MODELSCOPE_API_TOKEN` 留空时，AI 生成、审核、评分和配图都会走本地兜底逻辑，适合离线演示。

### 4. 启动服务

后端：

```bash
pnpm backend:dev
```

前端：

```bash
pnpm dev
```

前端默认通过 Umi proxy 将 `/api` 转发到 `http://localhost:3000`。

## 验证命令

```bash
pnpm run typecheck
pnpm run build
pnpm run test
pnpm run smoke:e2e
```

后端也可以单独做语法检查和单元测试：

```bash
pnpm --dir ai-creator-backend run check
pnpm --dir ai-creator-backend run test
```

## 交付文档

- [系统架构设计](docs/architecture.md)
- [内容安全审核规则与质量评估体系](docs/safety-quality-rules.md)
- [效果评估与内容分发优化报告](docs/evaluation-report.md)
- [部署与验收说明](docs/deployment-and-qa.md)

## 部署建议

前端执行 `pnpm run build` 后产物位于 `dist/`，可部署到静态资源服务或 CDN。后端部署为 Node.js 服务，需配置生产 MySQL、Redis、`JWT_SECRET` 和 AI provider 密钥。生产环境建议通过 Nginx 将 `/api` 反向代理到后端服务，其余路径走前端静态资源。
