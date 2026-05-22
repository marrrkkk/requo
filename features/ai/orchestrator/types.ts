import type { ModelMessage, Tool } from "ai";
import type { AiChatMessage } from "@/lib/ai";

// ---------------------------------------------------------------------------
// Orchestrator Input / Output
// ---------------------------------------------------------------------------

export type OrchestrateInput = {
  userId: string;
  businessId: string;
  conversationId: string;
  message: string;
  surface: "dashboard" | "inquiry" | "quote";
  entityId: string;
  businessSlug: string;
  conversationHistory: AiChatMessage[];
};

export type OrchestrateResult =
  | {
      ok: true;
      systemPrompt: string;
      tools: Record<string, Tool> | undefined;
      messages: ModelMessage[];
      onStreamComplete: (
        text: string,
        inputTokens: number,
        outputTokens: number,
      ) => Promise<void>;
    }
  | {
      ok: false;
      error: string;
      failedPhase:
        | "intent_classification"
        | "memory_retrieval"
        | "prompt_composition"
        | "tool_selection";
    };

// ---------------------------------------------------------------------------
// Intent Classification
// ---------------------------------------------------------------------------

export type IntentCategory =
  | "data_query"
  | "quote_action"
  | "follow_up_action"
  | "analytics"
  | "general_question"
  | "memory_recall"
  | "workflow_guidance";

export type ToolCategory = "query_tools" | "action_tools";

export type MemoryCategory =
  | "business_rules"
  | "pricing_knowledge"
  | "customer_context"
  | "workflow_preferences";

export type IntentResult = {
  intent: IntentCategory;
  toolCategories: ToolCategory[];
  memoryCategories: MemoryCategory[];
  promptModules: string[]; // max 10, each <= 64 chars
};

// ---------------------------------------------------------------------------
// Prompt Builder
// ---------------------------------------------------------------------------

export type PromptModuleName =
  | "base_identity"
  | "formatting_rules"
  | "tool_usage_instructions"
  | "sales_support"
  | "quoting_guidance"
  | "follow_up_guidance"
  | "safety_constraints"
  | "analytics_guidance";

export type PromptBuildResult =
  | {
      ok: true;
      systemPrompt: string;
      includedModules: PromptModuleName[];
      omittedModules: PromptModuleName[];
    }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Memory Retriever
// ---------------------------------------------------------------------------

export type RetrievedMemory = {
  id: string;
  content: string;
  category: MemoryCategory;
  similarity: number;
};

// ---------------------------------------------------------------------------
// Conversation Compressor
// ---------------------------------------------------------------------------

export type CompressionConfig = {
  messageThreshold: number; // default 10, min 6, max 50
  recentWindowSize: number; // default 6, min 2, max threshold - 1
};

// ---------------------------------------------------------------------------
// Orchestration Logger
// ---------------------------------------------------------------------------

export type OrchestrationLogEntry = {
  conversationId: string;
  userId: string;
  businessId: string;
  intentCategory: IntentCategory;
  promptModulesIncluded: PromptModuleName[];
  promptModulesOmitted: PromptModuleName[];
  totalPromptTokens: number;
  toolsInjectedCount: number;
  memoryEntriesRetrieved: number;
  memoryRetrievalMs: number;
  intentClassificationMs: number;
  totalOrchestrationOverheadMs: number;
  model: string;
  provider: string;
  timestamp: string; // ISO-8601 UTC
  phaseDurations: {
    classification: number;
    memoryRetrieval: number;
    promptComposition: number;
    toolSelection: number;
    streamSetup: number;
  };
  status: "success" | "partial_failure";
  failedPhase?: string;
};
