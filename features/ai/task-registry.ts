import { z } from "zod";

// ---------------------------------------------------------------------------
// Task type definitions
// ---------------------------------------------------------------------------

export const aiTaskTypes = [
  "inquiry_summary",
  "quote_draft",
  "followup_message",
  "quote_improvement",
  "form_suggestion",
  "business_memory_summary",
  "intent_classification",
  "assistant_message",
  "assistant_tool_call",
] as const;

export type AiTaskType = (typeof aiTaskTypes)[number];

// ---------------------------------------------------------------------------
// Task config schema
// ---------------------------------------------------------------------------

export const taskConfigSchema = z.object({
  taskType: z.enum(aiTaskTypes),
  qualityTier: z.enum(["balanced", "cheap", "best", "coding"]),
  maxOutputTokens: z.number().int().min(64).max(16384),
  temperature: z.number().min(0.0).max(2.0),
  requiredContextFields: z.array(z.string().min(1)),
  cacheTTL: z.number().int().min(0).max(86400),
  priorityWeight: z.number().int().min(1).max(10),
  streamingPermitted: z.boolean(),
  maxContextCharacters: z.number().int().min(500).max(32000).default(4000),
});

export type AiTaskConfig = z.infer<typeof taskConfigSchema>;

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const AI_TASK_REGISTRY: Record<AiTaskType, AiTaskConfig> = {
  inquiry_summary: {
    taskType: "inquiry_summary",
    qualityTier: "cheap",
    maxOutputTokens: 256,
    temperature: 0.2,
    requiredContextFields: [
      "inquiryDetails",
      "customerName",
      "serviceCategory",
    ],
    cacheTTL: 3600,
    priorityWeight: 1,
    streamingPermitted: false,
    maxContextCharacters: 2000,
  },
  quote_draft: {
    taskType: "quote_draft",
    qualityTier: "balanced",
    maxOutputTokens: 4096,
    temperature: 0.1,
    requiredContextFields: [
      "revisionContext",
      "currentItems",
      "inquiryText",
      "customerName",
      "customerEmail",
      "pricingBlocks",
      "tonePreference",
      "businessMemorySummary",
    ],
    cacheTTL: 1800,
    priorityWeight: 3,
    streamingPermitted: true,
    maxContextCharacters: 6000,
  },
  followup_message: {
    taskType: "followup_message",
    qualityTier: "cheap",
    maxOutputTokens: 256,
    temperature: 0.4,
    requiredContextFields: [
      "inquiryText",
      "customerName",
      "tonePreference",
      "followUpReason",
    ],
    cacheTTL: 900,
    priorityWeight: 1,
    streamingPermitted: false,
    maxContextCharacters: 2000,
  },
  quote_improvement: {
    taskType: "quote_improvement",
    qualityTier: "balanced",
    maxOutputTokens: 4096,
    temperature: 0.1,
    requiredContextFields: [
      "inquiryText",
      "customerName",
      "customerEmail",
      "pricingBlocks",
      "tonePreference",
      "businessMemorySummary",
      "existingQuoteDraft",
    ],
    cacheTTL: 900,
    priorityWeight: 2,
    streamingPermitted: true,
    maxContextCharacters: 8000,
  },
  form_suggestion: {
    taskType: "form_suggestion",
    qualityTier: "cheap",
    maxOutputTokens: 256,
    temperature: 0.3,
    requiredContextFields: [
      "businessType",
      "existingFields",
      "businessDescription",
    ],
    cacheTTL: 7200,
    priorityWeight: 1,
    streamingPermitted: false,
    maxContextCharacters: 2000,
  },
  business_memory_summary: {
    taskType: "business_memory_summary",
    qualityTier: "balanced",
    maxOutputTokens: 1024,
    temperature: 0.2,
    requiredContextFields: ["memoryEntries", "businessName", "businessType"],
    cacheTTL: 3600,
    priorityWeight: 1,
    streamingPermitted: false,
    maxContextCharacters: 4000,
  },
  intent_classification: {
    taskType: "intent_classification",
    qualityTier: "cheap",
    maxOutputTokens: 128,
    temperature: 0.1,
    requiredContextFields: ["message"],
    cacheTTL: 60,
    priorityWeight: 1,
    streamingPermitted: false,
    maxContextCharacters: 800,
  },
  assistant_message: {
    taskType: "assistant_message",
    qualityTier: "balanced",
    maxOutputTokens: 2048,
    temperature: 0.2,
    requiredContextFields: ["message"],
    cacheTTL: 0,
    priorityWeight: 1,
    streamingPermitted: true,
    maxContextCharacters: 8000,
  },
  assistant_tool_call: {
    taskType: "assistant_tool_call",
    qualityTier: "balanced",
    maxOutputTokens: 1024,
    temperature: 0.1,
    requiredContextFields: ["message"],
    cacheTTL: 0,
    priorityWeight: 1,
    streamingPermitted: true,
    maxContextCharacters: 4000,
  },
};

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Returns the task configuration for the given task type.
 * Throws if the task type is not recognized.
 */
export function getTaskConfig(taskType: string): AiTaskConfig {
  if (!aiTaskTypes.includes(taskType as AiTaskType)) {
    const validTypes = aiTaskTypes.join(", ");
    throw new Error(
      `Unknown AI task type "${taskType}". Valid types are: ${validTypes}`,
    );
  }

  return AI_TASK_REGISTRY[taskType as AiTaskType];
}

/**
 * Validates that all required context fields for the given task type are
 * present and non-empty in the payload. Throws if any are missing or empty.
 */
export function validateInvocationPayload(
  taskType: AiTaskType,
  payload: Record<string, unknown>,
): void {
  const config = AI_TASK_REGISTRY[taskType];
  const missingFields: string[] = [];

  for (const field of config.requiredContextFields) {
    const value = payload[field];

    if (value === undefined || value === null || value === "") {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required context fields for task "${taskType}": ${missingFields.join(", ")}`,
    );
  }
}
