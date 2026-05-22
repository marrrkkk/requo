export { generateWithFallback, streamWithFallback } from "./router";
export { isAiConfigured } from "./config";
export { registry } from "./registry";
export { AiProviderError, isRetryableError } from "./errors";
export {
  TOKEN_COST_TABLE,
  computeEstimatedCostCents,
  logAiInvocation,
} from "./token-logger";
export type { LogAiInvocationParams, TokenLogEntry } from "./token-logger";
export {
  NULL_SENTINEL,
  generateCacheKey,
  getCachedOutput,
  setCachedOutput,
} from "./ai-cache";
export type { CacheKeyComponents, CachedAiOutput } from "./ai-cache";
export type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiStreamResponse,
  AiStreamChunk,
  AiProviderName,
  AiChatMessage,
  AiQualityTier,
} from "./types";
export {
  PLAN_LIMITS,
  TASK_WEIGHTS,
  checkUsageLimit,
  recordUsage,
  startCooldown,
  resetCooldowns,
} from "./usage-limiter";
export type { UsageLimitCheck, UsageLimitResult } from "./usage-limiter";
export { summarizeDroppedMessages } from "./history-summarizer";
export {
  classifyMessageComplexity,
  getHistoryLimitForComplexity,
  getContextBudgetForComplexity,
} from "./message-complexity";
export type { MessageComplexity } from "./message-complexity";
export {
  generateEmbedding,
  cosineSimilarity,
  rankBySimilarity,
} from "./embeddings";
export {
  selectModels,
  selectToolCallingModels,
  selectSimpleTextModels,
  selectComplexTextModels,
  recordModelUsage,
  markModelExhausted,
  getCapacitySnapshot,
  getAllRegisteredModelIds,
} from "./capacity-selector";
export type { ModelCapacity } from "./capacity-selector";
