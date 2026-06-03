# CDN 静态资源策略

## 概述

平台采用双层 CDN 策略：前端静态资源（JS/CSS/HTML）走通用 CDN，
用户生成内容中的媒体文件走 OSS + CDN。

## 前端静态资源

### 构建产物部署

```bash
pnpm run build   # 产物 → dist/
```

`dist/` 目录可部署到：
- **阿里云 OSS + CDN**：上传到 OSS Bucket，绑定 CDN 加速域名
- **腾讯云 COS + CDN**：同等方式
- **Nginx**：小规模场景下的独立部署

### Umi 配置优化

在 `.umirc.ts` 中配置 `publicPath`：

```ts
export default defineConfig({
  publicPath: process.env.CDN_URL || "/",
  // ...
});
```

构建时注入 CDN 地址：

```bash
CDN_URL=https://cdn.example.com/aicd/ pnpm run build
```

### 缓存策略

| 资源类型 | 缓存时长 | 说明 |
|---------|---------|------|
| `*.js`, `*.css` (带 hash) | 1 年 (immutable) | Umi 构建产物默认带 content hash |
| `index.html` | 不缓存 / 5分钟 | 确保用户总能获取最新版本 |
| `favicon.png` | 30 天 | 静态资源，变化极少 |

### Nginx 缓存头示例

```nginx
location ~* \.(js|css)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location = /index.html {
    expires 5m;
    add_header Cache-Control "public";
}
```

## 用户生成内容（UGC）媒体

### 上传流程

```
用户 → 前端 → POST /api/v1/upload/credential → 后端返回 OSS 临时凭证
              → 前端直传 OSS (客户端签名) → POST /api/v1/upload/confirm
              → 素材 URL 写入 media_urls
```

### OSS + CDN 配置

1. OSS Bucket 开启 CDN 加速
2. CDN 域名配置 CORS（允许前端域名）
3. 设置合理的缓存策略

### 媒体缓存策略

| 内容类型 | 缓存时长 | 说明 |
|---------|---------|------|
| 图片 (`*.jpg`, `*.png`, `*.webp`) | 7 天 | 发布后不会修改 |
| 视频 (`*.mp4`) | 7 天 | 同上 |
| AI 生成图 (火山方舟 CDN) | 由火山方舟控制 | 签名 URL 自带过期时间 |

## 性能指标

使用 Web Vitals 监控：
- LCP < 2.5s（最大内容绘制）
- FID < 100ms（首次输入延迟）
- CLS < 0.1（累积布局偏移）

监控数据通过 `src/utils/performance.ts` 采集并持久化到 localStorage，
生产环境建议接入 RUM 平台（如阿里云 ARMS、Sentry）。
