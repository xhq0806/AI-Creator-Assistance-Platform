# AICD Platform — 本地运行指南

## 最简方式：双击启动（推荐）

### 使用者只需要两步

**第一步：安装 Docker Desktop**

从官网下载安装：https://www.docker.com/products/docker-desktop/

安装后启动 Docker Desktop，任务栏出现鲸鱼图标即可。

**第二步：双击 `start.bat`**

脚本会自动：
1. ✅ 检查 Docker 是否运行
2. ✅ 首次运行时创建 `.env` 配置文件（提示你填写 API Key）
3. ✅ 构建并启动所有服务（MySQL、Redis、后端、前端）
4. ✅ 等待就绪后告诉你访问地址

启动后在浏览器打开：

| 地址 | 内容 |
|------|------|
| `http://localhost:8080` | 🏠 前端页面 |
| `http://localhost:8080/api/v1/docs` | 📖 API 文档 |
| `http://localhost:8080/api/v1/health` | ❤️ 健康检查 |

停止服务：双击 `stop.bat` 或运行 `docker compose down`

---

## 完全零配置方案（使用预置镜像）

如果你不想等待本地构建（首次 `docker compose up --build` 大约需要 3-5 分钟），可以使用预构建的镜像。

在 `docker-compose.yml` 中，将 `build:` 部分替换为 `image:` 即可：

```yaml
# 原来（本地构建）
backend:
  build:
    context: ./ai-creator-backend
    dockerfile: Dockerfile

# 改为（使用预构建镜像，跳过编译）
backend:
  image: xqqbka/aicd-backend:latest
```

> 预构建镜像需要你或维护者事先 `docker build` 并 `docker push` 到 Docker Hub。对个人项目来说，本地构建就够了。

---

## 首次配置说明

第一次启动时，脚本会自动从模板创建 `.env` 文件。你需要编辑它，填写以下内容：

```ini
# 1. JWT 密钥 —— 随便改一个长字符串即可（本地使用无需强随机）
JWT_SECRET=my-local-platform-secret-key-2026
JWT_REFRESH_SECRET=my-local-refresh-secret-key-2026

# 2. AI —— 填写你的火山方舟 API Key
AI_PROVIDER=ark
ARK_API_KEY=你的_API_Key
```

其他配置保持默认即可，不用改。

---

## 常用命令

```bash
# 启动（后台运行）
docker compose up -d

# 启动并重新构建（代码有改动时）
docker compose up -d --build

# 查看运行状态
docker compose ps

# 实时查看日志
docker compose logs -f

# 只看后端日志
docker compose logs -f backend

# 停止
docker compose down

# 停止并清空数据库（重置一切）
docker compose down -v
```

---

## 架构说明

```
浏览器 (localhost:8080)
    │
    ▼
┌──────────────────┐
│  Nginx 容器       │  托管前端静态页面
│  (aicd-frontend) │  /api/* 请求转发给后端
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Express 容器     │  业务逻辑、AI 调用
│  (aicd-backend)  │
└──┬───────┬───────┘
   │       │
   ▼       ▼
┌──────┐ ┌──────┐
│MySQL │ │Redis │
│容器  │ │容器  │
└──────┘ └──────┘
```

四个服务都在 Docker 中运行，互不干扰。不使用时 `docker compose down` 即可，不占用系统资源。

---

## 常见问题

**Q: Docker Desktop 提示 "WSL 2 is not installed"？**
A: 按照提示安装 WSL 2，或是在 Docker Desktop 设置中切换到 Hyper-V 模式。

**Q: 端口被占用？**
A: 默认使用 8080 端口。如果被占用，编辑 `docker-compose.yml`，将 frontend 的 `ports` 改为 `"3000:80"` 或其他端口。

**Q: Docker Desktop 占用内存太大？**
A: 在 Docker Desktop 设置 → Resources 中限制内存（建议至少 4GB）。

**Q: 如何升级到新版本？**
A: `git pull` 拉取最新代码，然后 `docker compose up -d --build` 重新构建。
