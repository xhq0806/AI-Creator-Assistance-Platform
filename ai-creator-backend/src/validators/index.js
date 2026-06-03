const Joi = require('joi');

const schemas = {
  login: Joi.object({
    account: Joi.string().trim().max(100).required(),
    password: Joi.string().min(6).max(128).required(),
  }),

  register: Joi.object({
    username: Joi.string().trim().min(2).max(50).required(),
    password: Joi.string()
      .min(8).max(128)
      .pattern(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .message('密码需包含大小写字母和数字，至少 8 位')
      .required(),
    phone: Joi.string().pattern(/^1\d{10}$/).allow('', null),
    email: Joi.string().email().allow('', null),
  }),

  aiGenerate: Joi.object({
    prompt: Joi.string().trim().min(1).max(4000).required(),
    mode: Joi.string().valid('full_generation', 'structured', 'rewrite', 'outline').default('full_generation'),
    materials: Joi.array().items(Joi.string().uri().max(600)).max(20).default([]),
  }),

  aiGenerateImage: Joi.object({
    prompt: Joi.string().trim().max(2000).allow('', null),
    title: Joi.string().trim().max(255).allow('', null),
    content: Joi.string().trim().max(10000).allow('', null),
    materials: Joi.array().items(Joi.string().uri().max(600)).max(20).default([]),
  }),

  aiGenerateVideo: Joi.object({
    prompt: Joi.string().trim().max(2000).allow('', null),
    title: Joi.string().trim().max(255).allow('', null),
    content: Joi.string().trim().max(10000).allow('', null),
    materials: Joi.array().items(Joi.string().uri().max(600)).max(20).default([]),
  }),

  aiAudit: Joi.object({
    prompt: Joi.string().trim().max(4000).allow('', null),
    title: Joi.string().trim().max(255).allow('', null),
    content: Joi.string().trim().max(50000).allow('', null),
  }),

  aiQuality: Joi.object({
    title: Joi.string().trim().min(1).max(255).required(),
    content: Joi.string().trim().min(1).max(50000).required(),
  }),

  createPrompt: Joi.object({
    name: Joi.string().trim().min(1).max(80).required(),
    category: Joi.string().trim().max(40).default('通用'),
    content: Joi.string().trim().min(1).max(10000).required(),
  }),

  updatePrompt: Joi.object({
    name: Joi.string().trim().min(1).max(80),
    category: Joi.string().trim().max(40),
    content: Joi.string().trim().min(1).max(10000),
  }).min(1),

  createMaterial: Joi.object({
    name: Joi.string().trim().min(1).max(120).required(),
    url: Joi.string().uri().max(600).required(),
  }),

  uploadCredential: Joi.object({
    file_name: Joi.string().trim().min(1).max(255).required(),
    file_type: Joi.string().max(128).allow(''),
  }),

  confirmUpload: Joi.object({
    material_id: Joi.number().integer().positive().required(),
    file_size: Joi.number().integer().positive(),
    mime_type: Joi.string().max(128),
  }),

  createTeam: Joi.object({
    name: Joi.string().trim().min(1).max(128).required(),
  }),

  addTeamMember: Joi.object({
    team_id: Joi.number().integer().positive().required(),
    user_id: Joi.number().integer().positive().required(),
    role: Joi.string().valid('viewer', 'editor', 'admin').default('viewer'),
  }),

  savePromptWithVersion: Joi.object({
    id: Joi.number().integer().positive(),
    name: Joi.string().trim().min(1).max(128).required(),
    category: Joi.string().trim().max(64).required(),
    content: Joi.string().trim().min(1).max(10000).required(),
    change_note: Joi.string().max(512).allow('', null),
    visibility: Joi.string().valid('private', 'team_public', 'system_public').default('private'),
    team_id: Joi.number().integer().positive().allow(null),
  }),

  upsertDraft: Joi.object({
    id: Joi.number().integer().positive(),
    title: Joi.string().trim().max(255).required(),
    content: Joi.string().trim().max(50000).required(),
    media_urls: Joi.array().items(Joi.string().max(600)).max(50).default([]),
    category: Joi.string().trim().max(32).default('通用'),
    status: Joi.string().valid('draft', 'pending_review', 'published', 'rejected', 'withdrawn').default('draft'),
    auto_fix: Joi.boolean().default(false),
    prompt: Joi.string().trim().max(5000).allow('').optional(),
  }),

  syncDrafts: Joi.object({
    drafts: Joi.array().items(Joi.object({
      id: Joi.number().integer().positive(),
      localId: Joi.string().max(100),
      title: Joi.string().trim().max(255).allow(''),
      content: Joi.string().trim().max(50000).allow(''),
      media_urls: Joi.array().items(Joi.string().max(600)).max(50),
      status: Joi.string().valid('draft', 'pending_review', 'published', 'rejected', 'withdrawn'),
    })).max(100).default([]),
  }),

  articleFeedback: Joi.object({
    type: Joi.string().valid('like', 'favorite', 'negative').required(),
  }),

  updateProfile: Joi.object({
    username: Joi.string().trim().min(2).max(50),
    phone: Joi.string().pattern(/^1\d{10}$/).allow(null),
    email: Joi.string().email().allow(null),
  }).min(1),

  distributionSync: Joi.object({
    article_id: Joi.number().integer().positive().required(),
    platforms: Joi.array().items(Joi.string().valid('toutiao', 'douyin')).min(1).max(10).required(),
  }),

  createAuditAnnotation: Joi.object({
    article_id: Joi.number().integer().positive().allow(null),
    title: Joi.string().trim().min(1).max(1000).required(),
    content: Joi.string().trim().min(1).max(50000).required(),
    ai_prediction_risk: Joi.string().valid('SAFE', 'RISK_LOW', 'RISK_MEDIUM', 'RISK_HIGH').required(),
    ground_truth_risk: Joi.string().valid('SAFE', 'RISK_LOW', 'RISK_MEDIUM', 'RISK_HIGH').required(),
    risk_category: Joi.string().valid('NONE', 'PORN', 'GAMBLING', 'DRUG', 'POLITICAL', 'OTHER').default('NONE'),
    annotation_note: Joi.string().max(1000).allow('', null),
  }),

  changePassword: Joi.object({
    oldPassword: Joi.string().min(6).max(128).required(),
    newPassword: Joi.string()
      .min(8).max(128)
      .pattern(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .message('密码需包含大小写字母和数字，至少 8 位')
      .required(),
  }),

  idParam: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  templateIdParam: Joi.object({
    template_id: Joi.number().integer().positive().required(),
  }),

  cursorQuery: Joi.object({
    cursor: Joi.string().max(50),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),

  // ── Admin validators ─────────────────────────────────────
  adminListUsers: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().trim().max(100).allow(''),
    role: Joi.string().valid('user', 'editor', 'admin'),
    status: Joi.string().valid('active', 'disabled'),
  }),

  adminUpdateUser: Joi.object({
    role: Joi.string().valid('user', 'editor', 'admin'),
    status: Joi.string().valid('active', 'disabled'),
    phone: Joi.string().pattern(/^1\d{10}$/).allow(null),
    email: Joi.string().email().allow(null),
  }).min(1),

  adminReviewArticle: Joi.object({
    action: Joi.string().valid('approve', 'reject').required(),
    reason: Joi.string().max(500).allow('', null),
  }),

  adminListArticles: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('draft', 'pending_review', 'published', 'rejected', 'withdrawn'),
    category: Joi.string().trim().max(32),
    userId: Joi.number().integer().positive(),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso(),
  }),

  adminUpdateRankingWeights: Joi.object({
    qualityScore: Joi.number().min(0).max(2),
    aiRankScore: Joi.number().min(0).max(2),
    viewLog: Joi.number().min(0).max(2),
    feedbackLog: Joi.number().min(0).max(2),
    negative: Joi.number().min(0).max(2),
    age: Joi.number().min(0).max(2),
  }).min(1),

  adminUpdateAIConfig: Joi.object({
    provider: Joi.string().valid('ark', 'modelscope'),
    apiKey: Joi.string().max(255).allow(''),
    baseURL: Joi.string().uri().max(500).allow(''),
    textModel: Joi.string().max(100),
    imageModel: Joi.string().max(100).allow(''),
    videoModel: Joi.string().max(100).allow(''),
  }).min(1),

  adminUpdateRateLimit: Joi.object({
    globalWindowMs: Joi.number().integer().min(1000).max(3600000),
    globalMax: Joi.number().integer().min(1).max(10000),
    aiGenerate: Joi.number().integer().min(1).max(1000),
    aiGenerateImage: Joi.number().integer().min(1).max(1000),
    aiGenerateVideo: Joi.number().integer().min(1).max(1000),
    aiAudit: Joi.number().integer().min(1).max(1000),
    aiQuality: Joi.number().integer().min(1).max(1000),
  }).min(1),

  adminListMaterials: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    userId: Joi.number().integer().positive(),
    riskStatus: Joi.string().valid('approved', 'rejected'),
  }),

  adminOverrideMaterialRisk: Joi.object({
    riskStatus: Joi.string().valid('approved', 'rejected').required(),
    reason: Joi.string().max(500).allow('', null),
  }),

  adminUpdateAuditCategories: Joi.object({
    categories: Joi.array().items(Joi.object({
      key: Joi.string().required(),
      enabled: Joi.boolean().required(),
      label: Joi.string().max(50),
    })).min(1).max(20),
  }),
};

function getSchema(name) {
  const schema = schemas[name];
  if (!schema) {
    throw new Error(`Unknown validation schema: ${name}`);
  }
  return schema;
}

module.exports = { schemas, getSchema };