/**
 * Prompt Builder
 *
 * Composes system prompts from modular segments based on intent classification.
 * - Always includes base_identity (priority 1) and safety_constraints (priority 2)
 * - Orders remaining modules by fixed priority rank
 * - Enforces 1600-token budget (chars / 4 approximation)
 * - Omits lowest-priority modules first when over budget
 * - Returns error if mandatory modules exceed budget
 * - Ignores unrecognized module names with warning log
 * - Integrates with prompt cache for rendered segments
 * - Embeds a deterministic canary token per business for leak detection
 */

import { createHash, createHmac } from "crypto";

import {
  BASE_IDENTITY_PROMPT,
  SAFETY_CONSTRAINTS_PROMPT,
  FORMATTING_RULES_PROMPT,
  TOOL_USAGE_INSTRUCTIONS_PROMPT,
  SALES_SUPPORT_PROMPT,
  QUOTING_GUIDANCE_PROMPT,
  FOLLOW_UP_GUIDANCE_PROMPT,
  ANALYTICS_GUIDANCE_PROMPT,
} from "@/features/ai/prompts/modules";
import { getCachedSegment, setCachedSegment } from "./prompt-cache";
import type { IntentResult, PromptBuildResult, PromptModuleName } from "./types";

// ---------------------------------------------------------------------------
// Module Registry
// ---------------------------------------------------------------------------

/** Priority order (1 = highest priority, included first) */
const MODULE_PRIORITY: Record<PromptModuleName, number> = {
  base_identity: 1,
  safety_constraints: 2,
  tool_usage_instructions: 3,
  formatting_rules: 4,
  quoting_guidance: 5,
  follow_up_guidance: 6,
  sales_support: 7,
  analytics_guidance: 8,
};

/** Module content mapping */
const MODULE_CONTENT: Record<PromptModuleName, string> = {
  base_identity: BASE_IDENTITY_PROMPT,
  safety_constraints: SAFETY_CONSTRAINTS_PROMPT,
  tool_usage_instructions: TOOL_USAGE_INSTRUCTIONS_PROMPT,
  formatting_rules: FORMATTING_RULES_PROMPT,
  quoting_guidance: QUOTING_GUIDANCE_PROMPT,
  follow_up_guidance: FOLLOW_UP_GUIDANCE_PROMPT,
  sales_support: SALES_SUPPORT_PROMPT,
  analytics_guidance: ANALYTICS_GUIDANCE_PROMPT,
};

const MANDATORY_MODULES: PromptModuleName[] = [
  "base_identity",
  "safety_constraints",
];

const ALL_MODULE_NAMES = new Set<string>(Object.keys(MODULE_PRIORITY));

/** Token budget: 1600 tokens, approximated as chars / 4 */
const TOKEN_BUDGET = 1600;

/**
 * Server-side secret for canary token generation.
 * Uses AI_CANARY_SECRET env var, falls back to a hardcoded default for dev.
 */
const CANARY_SECRET = process.env.AI_CANARY_SECRET || "requo-canary-dev-secret-do-not-use-in-prod";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Approximate token count from character length.
 * Uses the standard chars/4 heuristic consistently across all budget calculations.
 *
 * Validates: Requirement 17.1
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Compute SHA-256 content hash for a module's content */
function computeContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Get a rendered module segment, using the prompt cache when available.
 * Falls back to raw content on hash computation errors.
 */
function getRenderedSegment(moduleName: PromptModuleName): string {
  const content = MODULE_CONTENT[moduleName];

  try {
    const contentHash = computeContentHash(content);

    // Check cache
    const cached = getCachedSegment(moduleName, contentHash);
    if (cached !== null) {
      return cached;
    }

    // Store in cache and return
    setCachedSegment(moduleName, contentHash, content);
    return content;
  } catch {
    // Bypass cache on hash computation error
    return content;
  }
}

/**
 * Generates a deterministic canary token for a given business ID.
 * Uses HMAC-SHA256 of businessId + server secret, truncated to 16 hex chars.
 * The token is unique per business but reproducible for detection.
 */
export function generateCanaryToken(businessId: string): string {
  return createHmac("sha256", CANARY_SECRET)
    .update(businessId)
    .digest("hex")
    .slice(0, 16);
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

/**
 * Composes a system prompt from modular segments based on intent classification.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 7.1, 7.2, 7.3, 26.1, 26.2, 26.3
 */
export function buildPrompt(
  intentResult: IntentResult,
  memoryContext: string | null,
  conversationSummary: string | null,
  options?: { businessId?: string; businessName?: string; pricingBlocks?: string | null },
): PromptBuildResult {
  const includedModules: PromptModuleName[] = [];
  const omittedModules: PromptModuleName[] = [];

  // Filter requested modules to known names, warn on unrecognized
  const requestedModules: PromptModuleName[] = [];
  for (const name of intentResult.promptModules) {
    if (ALL_MODULE_NAMES.has(name)) {
      requestedModules.push(name as PromptModuleName);
    } else {
      console.warn(
        `[prompt-builder] Unrecognized prompt module: "${name}" — ignoring`,
      );
    }
  }

  // Build the full set of modules to consider (mandatory + requested, deduplicated)
  const moduleSet = new Set<PromptModuleName>(MANDATORY_MODULES);
  for (const mod of requestedModules) {
    moduleSet.add(mod);
  }

  // Sort by priority (ascending number = higher priority = included first)
  const sortedModules = Array.from(moduleSet).sort(
    (a, b) => MODULE_PRIORITY[a] - MODULE_PRIORITY[b],
  );

  // Calculate budget consumed by additional sections (memory + summary)
  let additionalSectionsTokens = 0;
  let additionalSectionsText = "";

  if (memoryContext) {
    const section = `\n\nRELEVANT CONTEXT:\n${memoryContext}`;
    additionalSectionsText += section;
    additionalSectionsTokens += estimateTokens(section);
  }

  if (conversationSummary) {
    const section = `\n\nCONVERSATION SUMMARY:\n${conversationSummary}`;
    additionalSectionsText += section;
    additionalSectionsTokens += estimateTokens(section);
  }

  // Pricing hallucination guardrail (Requirement 7.1, 7.2, 7.3)
  const pricingBlocks = options?.pricingBlocks;
  const pricingIsEmpty =
    pricingBlocks === null ||
    pricingBlocks === undefined ||
    pricingBlocks === "" ||
    pricingBlocks === "- No saved pricing entries.";

  if (pricingIsEmpty) {
    const guardrail =
      "\n\nPRICING GUARDRAIL: No pricing data is available. All line item unitPriceInCents MUST be set to 0. Pricing requires manual entry by the business owner. Include a note that pricing is pending owner review.";
    additionalSectionsText += guardrail;
    additionalSectionsTokens += estimateTokens(guardrail);
  }

  const availableBudget = TOKEN_BUDGET - additionalSectionsTokens;

  // Check if mandatory modules alone exceed budget
  let mandatoryTokens = 0;
  for (const mod of MANDATORY_MODULES) {
    mandatoryTokens += estimateTokens(getRenderedSegment(mod));
  }

  if (mandatoryTokens > availableBudget) {
    return {
      ok: false,
      error:
        "Mandatory modules (base_identity, safety_constraints) exceed the 1600-token budget",
    };
  }

  // Include modules in priority order, respecting budget
  let usedTokens = 0;
  const segments: string[] = [];

  for (const moduleName of sortedModules) {
    let rendered = getRenderedSegment(moduleName);

    // Inject business name into base_identity template (Requirement 26.1, 26.2, 26.3)
    if (moduleName === "base_identity" && options?.businessName) {
      rendered = rendered.replace(
        "You are Requo's assistant for an owner-led service business.",
        `You are the AI assistant for ${options.businessName}.`,
      );
    }

    const moduleTokens = estimateTokens(rendered);

    if (usedTokens + moduleTokens <= availableBudget) {
      segments.push(rendered);
      includedModules.push(moduleName);
      usedTokens += moduleTokens;
    } else {
      // Only omit non-mandatory modules
      if (MANDATORY_MODULES.includes(moduleName)) {
        // Mandatory modules must always be included
        segments.push(rendered);
        includedModules.push(moduleName);
        usedTokens += moduleTokens;
      } else {
        omittedModules.push(moduleName);
        console.info(
          `[prompt-builder] Omitted module "${moduleName}" — budget exceeded (${usedTokens + moduleTokens} tokens > ${availableBudget} available)`,
        );
      }
    }
  }

  // Compose the final prompt
  let systemPrompt = segments.join("\n\n");
  systemPrompt += additionalSectionsText;

  // Embed canary token if businessId is provided
  if (options?.businessId) {
    const canaryToken = generateCanaryToken(options.businessId);
    systemPrompt += `\n\n<!-- ${canaryToken} -->`;
  }

  return {
    ok: true,
    systemPrompt,
    includedModules,
    omittedModules,
  };
}
