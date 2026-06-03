import "server-only";

import type { ModelMessage } from "ai";

import { classifyIntent } from "./intent-classifier";
import { retrieveMemories } from "./memory-retriever";
import { buildPrompt } from "./prompt-builder";
import { selectTools } from "./tool-selector";
import { getMaxOutputTokensForIntent } from "./token-allocation";
import { compressConversation, getConversationContext } from "./conversation-compressor";
import { logOrchestration, createTimer } from "./orchestration-logger";
import type {
  OrchestrateInput,
  OrchestrateResult,
  IntentResult,
  RetrievedMemory,
  PromptModuleName,
  OrchestrationLogEntry,
} from "./types";
import type { AiToolExecutionContext } from "../tools/types";

// ---------------------------------------------------------------------------
// Orchestrator — top-level coordinator for the AI conversational pipeline.
//
// Replaces the inline logic in `createAiChatRouteResponse` with a structured
// pipeline: classify intent → parallel retrieval → compose prompt → select tools.
//
// Enforces a 2000ms pre-stream budget. Returns composed systemPrompt, tools,
// messages, and an onStreamComplete callback for async post-stream operations.
// ---------------------------------------------------------------------------

const PRE_STREAM_BUDGET_MS = 2_500;

/**
 * Orchestrate the full pre-stream AI pipeline.
 *
 * 1. Classify intent (with its own internal 2s timeout)
 * 2. In parallel: memory retrieval + conversation context
 * 3. Then: build prompt (needs memory + summary) + select tools
 * 4. Return composed result with onStreamComplete callback
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */
export async function orchestrate(input: OrchestrateInput): Promise<OrchestrateResult> {
  const overallTimer = createTimer();
  const phaseTimers = {
    classification: -1,
    memoryRetrieval: -1,
    promptComposition: -1,
    toolSelection: -1,
    streamSetup: -1,
  };

  // Build the tool execution context from input
  const ctx: AiToolExecutionContext = {
    businessId: input.businessId,
    businessSlug: input.businessSlug,
    userId: input.userId,
  };

  let intentResult: IntentResult;
  let memories: RetrievedMemory[] = [];
  let includedModules: PromptModuleName[] = [];
  let omittedModules: PromptModuleName[] = [];

  // ---------------------------------------------------------------------------
  // Phase 1+2: Intent Classification + Memory Retrieval (PARALLEL)
  //
  // Run intent classification and baseline memory retrieval concurrently.
  // Memory always queries "business_rules" (owner knowledge entries).
  // After intent resolves, we merge any additional memory categories and
  // fetch those too (if budget remains).
  // ---------------------------------------------------------------------------
  const classificationTimer = createTimer();
  const memoryTimer = createTimer();
  let memoryContext: string | null = null;
  let conversationSummary: string | null = null;

  try {
    // Start both in parallel: intent classification + baseline memory + conversation context
    const [intentResultRaw, baselineMemories, conversationResult] = await raceWithBudget(
      Promise.all([
        classifyIntent(input.message, input.conversationId),
        retrieveMemories(input.message, input.businessId, ["business_rules"]).catch(() => [] as RetrievedMemory[]),
        getConversationContext(input.conversationId, input.conversationHistory).catch(() => ({ summary: null, messages: input.conversationHistory })),
      ]),
      PRE_STREAM_BUDGET_MS,
    );

    intentResult = intentResultRaw;
    phaseTimers.classification = classificationTimer.elapsed();

    // Merge baseline memories with any additional categories from intent
    memories = baselineMemories;
    conversationSummary = conversationResult.summary;

    // If intent classifier requested additional memory categories beyond business_rules,
    // fetch those too (only if we have budget remaining)
    const additionalCategories = intentResult.memoryCategories.filter(c => c !== "business_rules");
    if (additionalCategories.length > 0) {
      const remainingBudget = PRE_STREAM_BUDGET_MS - overallTimer.elapsed();
      if (remainingBudget > 200) {
        try {
          const additionalMemories = await raceWithBudget(
            retrieveMemories(input.message, input.businessId, additionalCategories),
            remainingBudget,
          );
          // Deduplicate by ID
          const existingIds = new Set(memories.map(m => m.id));
          for (const m of additionalMemories) {
            if (!existingIds.has(m.id)) {
              memories.push(m);
            }
          }
        } catch {
          // Non-critical — we already have baseline memories
        }
      }
    }

    phaseTimers.memoryRetrieval = memoryTimer.elapsed();

    // Format memory context for prompt injection with confidence tier prefix
    if (memories.length > 0) {
      memoryContext = memories
        .map((m) => `[${m.confidenceTier}] [${m.category}] ${m.content}`)
        .join("\n");
    }
  } catch (error) {
    phaseTimers.classification = classificationTimer.elapsed();
    phaseTimers.memoryRetrieval = memoryTimer.elapsed();

    // If the parallel phase completely failed, we still need intentResult
    // Try to use a cached/default intent result
    if (error instanceof Error && error.message.includes("budget")) {
      // Budget exceeded — use default intent
      intentResult = {
        intent: "general_question",
        toolCategories: ["query_tools", "action_tools"],
        memoryCategories: [],
        promptModules: ["base_identity", "safety_constraints", "tool_usage_instructions"],
      };
    } else {
      return {
        ok: false,
        error: `Orchestration failed: ${error instanceof Error ? error.message : "unknown error"}`,
        failedPhase: "intent_classification",
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 3: Prompt Composition
  // ---------------------------------------------------------------------------
  const promptTimer = createTimer();
  let systemPrompt: string;

  try {
    // Ensure tool_usage_instructions is included when tools will be injected
    if (
      intentResult.toolCategories.length > 0 &&
      !intentResult.promptModules.includes("tool_usage_instructions")
    ) {
      intentResult = {
        ...intentResult,
        promptModules: [...intentResult.promptModules, "tool_usage_instructions"],
      };
    }

    const promptResult = buildPrompt(intentResult, memoryContext, conversationSummary, {
      businessId: input.businessId,
      businessName: input.businessName,
      pricingBlocks: input.pricingBlocks,
    });

    if (!promptResult.ok) {
      phaseTimers.promptComposition = promptTimer.elapsed();
      return {
        ok: false,
        error: `Prompt composition failed: ${"error" in promptResult ? promptResult.error : "unknown"}`,
        failedPhase: "prompt_composition",
      };
    }

    systemPrompt = promptResult.systemPrompt;
    includedModules = promptResult.includedModules;
    omittedModules = promptResult.omittedModules;
    phaseTimers.promptComposition = promptTimer.elapsed();
  } catch (error) {
    phaseTimers.promptComposition = promptTimer.elapsed();
    return {
      ok: false,
      error: `Prompt composition failed: ${error instanceof Error ? error.message : "unknown error"}`,
      failedPhase: "prompt_composition",
    };
  }

  // ---------------------------------------------------------------------------
  // Phase 4: Tool Selection
  // ---------------------------------------------------------------------------
  const toolTimer = createTimer();
  let tools: Record<string, import("ai").Tool> | undefined;

  try {
    tools = selectTools(intentResult, ctx);
    phaseTimers.toolSelection = toolTimer.elapsed();
  } catch (error) {
    phaseTimers.toolSelection = toolTimer.elapsed();
    return {
      ok: false,
      error: `Tool selection failed: ${error instanceof Error ? error.message : "unknown error"}`,
      failedPhase: "tool_selection",
    };
  }

  // ---------------------------------------------------------------------------
  // Compose Messages (CoreMessage[] format for Vercel AI SDK)
  // ---------------------------------------------------------------------------
  const setupTimer = createTimer();

  const messages: ModelMessage[] = [];

  // If summary exists, prepend as system message
  if (conversationSummary) {
    messages.push({
      role: "system",
      content: `Previous conversation summary:\n${conversationSummary}`,
    });
  }

  // Add recent conversation history
  for (const msg of input.conversationHistory) {
    if (msg.role === "user" || msg.role === "assistant") {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  // Add the current user message
  messages.push({
    role: "user",
    content: input.message,
  });

  phaseTimers.streamSetup = setupTimer.elapsed();

  // ---------------------------------------------------------------------------
  // Build onStreamComplete callback
  // ---------------------------------------------------------------------------
  const totalOverheadMs = overallTimer.elapsed();

  const onStreamComplete = async (
    _text: string,
    inputTokens: number,
    _outputTokens: number,
  ): Promise<void> => {
    // Fire-and-forget: conversation compression
    compressConversation(input.conversationId, [
      ...input.conversationHistory,
      { role: "user", content: input.message },
      { role: "assistant", content: _text },
    ]).catch((err) => {
      console.error(
        `[orchestrator] Conversation compression failed for ${input.conversationId}:`,
        err instanceof Error ? err.message : err,
      );
    });

    // Log orchestration metrics
    const logEntry: OrchestrationLogEntry = {
      conversationId: input.conversationId,
      userId: input.userId,
      businessId: input.businessId,
      intentCategory: intentResult.intent,
      promptModulesIncluded: includedModules,
      promptModulesOmitted: omittedModules,
      totalPromptTokens: inputTokens,
      toolsInjectedCount: tools ? Object.keys(tools).length : 0,
      memoryEntriesRetrieved: memories.length,
      memoryRetrievalMs: phaseTimers.memoryRetrieval,
      intentClassificationMs: phaseTimers.classification,
      totalOrchestrationOverheadMs: totalOverheadMs,
      model: "auto",
      provider: "auto",
      timestamp: new Date().toISOString(),
      phaseDurations: phaseTimers,
      status: "success",
    };

    try {
      await logOrchestration(logEntry);
    } catch (err) {
      console.error(
        "[orchestrator] Orchestration logging failed:",
        err instanceof Error ? err.message : err,
      );
    }
  };

  return {
    ok: true,
    systemPrompt,
    tools,
    messages,
    maxOutputTokens: getMaxOutputTokensForIntent(intentResult.intent),
    retrievedMemories: memories,
    onStreamComplete,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Race a promise against a timeout budget. Rejects if the budget is exceeded.
 */
function raceWithBudget<T>(promise: Promise<T>, budgetMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      const id = setTimeout(
        () => reject(new Error(`Pre-stream budget exceeded (${budgetMs}ms)`)),
        budgetMs,
      );
      // Allow the timer to not block process exit
      if (typeof id === "object" && "unref" in id) {
        (id as NodeJS.Timeout).unref();
      }
    }),
  ]);
}
