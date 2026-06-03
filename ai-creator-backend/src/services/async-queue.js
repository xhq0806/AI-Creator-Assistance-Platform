/**
 * 异步任务队列 — BullMQ + Redis
 *
 * 用于将 AI 生成、审核、评分等耗时操作从同步请求中解耦，
 * 改为发布-消费模式，提升高并发下的稳定性和用户体验。
 *
 * 依赖：pnpm add bullmq (需 Redis)
 *
 * 使用方式：
 *   const { aiQueue } = require("./services/async-queue");
 *   const job = await aiQueue.add("generate", { prompt, mode });
 *   res.json({ jobId: job.id });  // 前端轮询或 WebSocket 获取结果
 */

let Queue, Worker;

try {
  const bullmq = require("bullmq");
  Queue = bullmq.Queue;
  Worker = bullmq.Worker;
} catch {
  // bullmq 未安装时降级为空实现
}

const redis = require("../config/redis");
const { logger } = require("../utils/logger");
const aiService = require("./ai.service");

const QUEUE_NAME = "ai-tasks";
const MAX_CONCURRENCY = 3; // 并行消费数

let aiQueue = null;
let aiWorker = null;

function getQueue() {
  if (aiQueue) return aiQueue;
  if (!Queue) {
    logger.warn("BullMQ 未安装，异步队列降级为同步模式");
    return null;
  }
  aiQueue = new Queue(QUEUE_NAME, { connection: redis });
  logger.info("Async queue initialized: " + QUEUE_NAME);
  return aiQueue;
}

function startWorker() {
  if (!Worker) return null;
  if (aiWorker) return aiWorker;

  aiWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { type, payload } = job.data;
      logger.info("Processing AI job", { jobId: job.id, type });

      switch (type) {
        case "generate":
          return aiService.generateContent(payload);
        case "audit":
          return aiService.auditContent(payload);
        case "quality":
          return aiService.evaluateQuality(payload);
        case "generateImage":
          return aiService.generateImage(payload);
        default:
          throw new Error(`Unknown job type: ${type}`);
      }
    },
    {
      connection: redis,
      concurrency: MAX_CONCURRENCY,
    }
  );

  aiWorker.on("completed", (job) => {
    logger.info("AI job completed", { jobId: job.id, type: job.data.type });
  });
  aiWorker.on("failed", (job, err) => {
    logger.error("AI job failed", { jobId: job?.id, type: job?.data?.type, error: err.message });
  });

  logger.info("Async worker started with concurrency=" + MAX_CONCURRENCY);
  return aiWorker;
}

async function enqueueJob(type, payload) {
  const queue = getQueue();
  if (!queue) {
    // 降级为同步调用
    logger.info("Queue unavailable, falling back to sync", { type });
    switch (type) {
      case "generate": return aiService.generateContent(payload);
      case "audit": return aiService.auditContent(payload);
      case "quality": return aiService.evaluateQuality(payload);
      case "generateImage": return aiService.generateImage(payload);
      default: throw new Error(`Unknown type: ${type}`);
    }
  }

  const job = await queue.add(type, { type, payload }, {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 3600 },  // 保留结果 1 小时
    removeOnFail: { age: 86400 },      // 保留失败 24 小时
  });

  return { jobId: job.id, status: "queued" };
}

async function getJobResult(jobId) {
  const queue = getQueue();
  if (!queue) throw new Error("Queue not available");
  const job = await queue.getJob(jobId);
  if (!job) throw new Error("Job not found");
  const state = await job.getState();
  if (state === "completed") return { status: "completed", result: job.returnvalue };
  if (state === "failed") return { status: "failed", error: job.failedReason };
  return { status: state };
}

module.exports = { getQueue, startWorker, enqueueJob, getJobResult };
