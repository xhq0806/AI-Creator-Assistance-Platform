const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'local-dev-secret',
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE || 'ai_creator',
    username: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
  },
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS || 60000),
  aiProvider: process.env.AI_PROVIDER || 'modelscope',
  modelscope: {
    apiKey: process.env.MODELSCOPE_API_TOKEN || '',
    baseURL: process.env.MODELSCOPE_BASE_URL || 'https://api-inference.modelscope.cn/v1',
    textModel: process.env.MODELSCOPE_TEXT_MODEL || 'Qwen/Qwen3-235B-A22B-Instruct-2507',
    imageModel: process.env.MODELSCOPE_IMAGE_MODEL || 'Qwen/Qwen-Image',
  },
  ark: {
    apiKey: process.env.ARK_API_KEY || '',
    baseURL: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
    textModel: process.env.ARK_TEXT_MODEL || process.env.ARK_MODEL || 'doubao-seed-2-0-lite-260428',
    imageModel: process.env.ARK_IMAGE_MODEL || process.env.ARK_MODEL || '',
    imageApi: process.env.ARK_IMAGE_API || 'responses',
    videoModel: process.env.ARK_VIDEO_MODEL || '',
    videoApi: process.env.ARK_VIDEO_API || 'responses',
  },
  cloud: {
    provider: process.env.CLOUD_PROVIDER || 'mock',
    ossAccessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
    ossAccessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
    ossBucket: process.env.OSS_BUCKET || 'ai-creator',
    ossRegion: process.env.OSS_REGION || 'oss-cn-hangzhou',
  },
};
