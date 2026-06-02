/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     tags: [Auth]
 *     summary: 健康检查
 *     responses:
 *       200:
 *         description: 服务正常
 */

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: 用户登录
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [account, password]
 *             properties:
 *               account: { type: string, example: "admin" }
 *               password: { type: string, example: "Admin123" }
 *     responses:
 *       200:
 *         description: 登录成功，返回 token 和 refreshToken
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: 用户注册
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, email]
 *             properties:
 *               username: { type: string }
 *               password: { type: string, description: "至少8位，含大小写字母和数字" }
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: "注册成功" }
 */

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: 刷新令牌
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: "返回新的 token" }
 */

/**
 * @swagger
 * /api/v1/ai/generate:
 *   post:
 *     tags: [AI]
 *     summary: AI 生成文章内容
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt: { type: string, description: "创作提示词" }
 *               mode: { type: string, enum: [full_generation, structured], description: "生成模式" }
 *               title: { type: string }
 *               content: { type: string }
 *     responses:
 *       200: { description: "返回生成的标题、正文和标签" }
 */

/**
 * @swagger
 * /api/v1/ai/generate-image:
 *   post:
 *     tags: [AI]
 *     summary: AI 生成配图
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt: { type: string }
 *               title: { type: string }
 *               content: { type: string }
 *     responses:
 *       200: { description: "返回图片地址和提示词" }
 */

/**
 * @swagger
 * /api/v1/ai/generate-video:
 *   post:
 *     tags: [AI]
 *     summary: AI 生成视频素材（需配置 ARK_VIDEO_MODEL）
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt: { type: string }
 *               title: { type: string }
 *               content: { type: string }
 *     responses:
 *       200: { description: "返回视频地址" }
 */

/**
 * @swagger
 * /api/v1/ai/audit:
 *   post:
 *     tags: [AI]
 *     summary: AI 内容安全审核
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               prompt: { type: string }
 *     responses:
 *       200: { description: "返回合规判断、风险等级和理由" }
 */

/**
 * @swagger
 * /api/v1/ai/quality:
 *   post:
 *     tags: [AI]
 *     summary: AI 内容质量评估
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *     responses:
 *       200: { description: "返回质量分、结构/深度/流畅度子维度" }
 */

/**
 * @swagger
 * /api/v1/ai/generation-history:
 *   get:
 *     tags: [AI]
 *     summary: 获取 AI 生成历史
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: "返回历史记录列表" }
 */

/**
 * @swagger
 * /api/v1/ai/generation-history/{id}:
 *   delete:
 *     tags: [AI]
 *     summary: 删除生成历史记录
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "删除成功" }
 */

/**
 * @swagger
 * /api/v1/articles/search:
 *   get:
 *     tags: [Articles]
 *     summary: 搜索文章
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         description: "搜索关键词，至少2个字符"
 *     responses:
 *       200: { description: "返回匹配文章列表" }
 */

/**
 * @swagger
 * /api/v1/articles/{id}:
 *   get:
 *     tags: [Articles]
 *     summary: 获取文章详情
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: "返回文章详情" }
 */

/**
 * @swagger
 * /api/v1/articles/draft:
 *   post:
 *     tags: [Articles]
 *     summary: 保存草稿
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               category: { type: string }
 *               media_urls: { type: array, items: { type: string } }
 *     responses:
 *       200: { description: "返回保存后的文章" }
 */

/**
 * @swagger
 * /api/v1/articles/drafts/sync:
 *   post:
 *     tags: [Articles]
 *     summary: 同步离线草稿
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: "返回同步结果" }
 */

/**
 * @swagger
 * /api/v1/articles/{id}/versions:
 *   get:
 *     tags: [Articles]
 *     summary: 获取文章版本历史
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: "返回版本列表" }
 */

/**
 * @swagger
 * /api/v1/rank/hot:
 *   get:
 *     tags: [Rank]
 *     summary: 获取热榜文章
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *         description: "游标分页"
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: "分类筛选"
 *       - in: query
 *         name: time_range
 *         schema: { type: string, enum: [today, week, month] }
 *     responses:
 *       200: { description: "返回热榜列表和下一页游标" }
 */

/**
 * @swagger
 * /api/v1/prompts:
 *   get:
 *     tags: [Prompts]
 *     summary: 获取 Prompt 模板列表
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: "返回模板列表" }
 *   post:
 *     tags: [Prompts]
 *     summary: 创建 Prompt 模板
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, content]
 *             properties:
 *               name: { type: string }
 *               category: { type: string }
 *               content: { type: string }
 *     responses:
 *       200: { description: "返回创建的模板" }
 */

/**
 * @swagger
 * /api/v1/prompts/{id}:
 *   put:
 *     tags: [Prompts]
 *     summary: 更新 Prompt 模板
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: "更新成功" }
 *   delete:
 *     tags: [Prompts]
 *     summary: 删除 Prompt 模板
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: "删除成功" }
 */

/**
 * @swagger
 * /api/v1/materials:
 *   get:
 *     tags: [Materials]
 *     summary: 获取素材列表
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: media_type
 *         schema: { type: string, enum: [image, video, audio] }
 *       - in: query
 *         name: risk_status
 *         schema: { type: string, enum: [approved, rejected] }
 *     responses:
 *       200: { description: "返回素材列表" }
 *   post:
 *     tags: [Materials]
 *     summary: 创建素材（自动多模态审核）
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, url]
 *             properties:
 *               name: { type: string }
 *               url: { type: string, format: uri }
 *               file_size: { type: integer }
 *               mime_type: { type: string }
 *     responses:
 *       200: { description: "返回创建的素材" }
 */

/**
 * @swagger
 * /api/v1/materials/{id}:
 *   delete:
 *     tags: [Materials]
 *     summary: 删除素材
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: "删除成功" }
 */

/**
 * @swagger
 * /api/v1/materials/{id}/audit:
 *   post:
 *     tags: [Materials]
 *     summary: 重新审核素材
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: "返回审核结果" }
 */

/**
 * @swagger
 * /api/v1/upload/credential:
 *   post:
 *     tags: [Upload]
 *     summary: 获取上传凭证
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [file_name]
 *             properties:
 *               file_name: { type: string }
 *               file_type: { type: string }
 *     responses:
 *       200: { description: "返回上传 URL 和凭证" }
 */

/**
 * @swagger
 * /api/v1/upload/confirm:
 *   post:
 *     tags: [Upload]
 *     summary: 确认上传完成
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: "确认成功" }
 */

/**
 * @swagger
 * /api/v1/audit/annotations:
 *   get:
 *     tags: [Audit]
 *     summary: 获取审核标注列表
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: risk_category
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200: { description: "返回标注列表" }
 *   post:
 *     tags: [Audit]
 *     summary: 创建人工标注
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content, ai_prediction_risk, ground_truth_risk]
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               ai_prediction_risk: { type: string, enum: [SAFE, RISK_LOW, RISK_MEDIUM, RISK_HIGH] }
 *               ground_truth_risk: { type: string, enum: [SAFE, RISK_LOW, RISK_MEDIUM, RISK_HIGH] }
 *               risk_category: { type: string }
 *               annotation_note: { type: string }
 *     responses:
 *       200: { description: "创建成功" }
 */

/**
 * @swagger
 * /api/v1/audit/seed-samples:
 *   post:
 *     tags: [Audit]
 *     summary: 批量生成种子标注样本
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clear_existing: { type: boolean, description: "是否清空已有标注" }
 *     responses:
 *       200: { description: "返回创建数量" }
 */

/**
 * @swagger
 * /api/v1/audit/evaluation/report:
 *   post:
 *     tags: [Audit]
 *     summary: 生成审核准确率评估报告（含混淆矩阵和按类别/等级拆分）
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: "返回评估报告" }
 */

/**
 * @swagger
 * /api/v1/audit/evaluation/reports:
 *   get:
 *     tags: [Audit]
 *     summary: 获取评估报告列表
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: "返回报告列表" }
 */

/**
 * @swagger
 * /api/v1/audit/evaluation/reports/{id}:
 *   get:
 *     tags: [Audit]
 *     summary: 获取评估报告详情
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: "返回报告详情含混淆矩阵" }
 */

/**
 * @swagger
 * /api/v1/users/me:
 *   get:
 *     tags: [Users]
 *     summary: 获取当前用户信息
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: "返回用户信息" }
 *   put:
 *     tags: [Users]
 *     summary: 更新用户资料
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: "更新成功" }
 */

/**
 * @swagger
 * /api/v1/distribution/sync:
 *   post:
 *     tags: [Distribution]
 *     summary: 同步分发到第三方平台
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [article_id, platforms]
 *             properties:
 *               article_id: { type: integer }
 *               platforms: { type: array, items: { type: string } }
 *     responses:
 *       200: { description: "返回分发状态" }
 */
