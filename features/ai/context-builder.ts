import { getTaskConfig, type AiTaskType } from "./task-registry";
import { estimateTokens } from "./orchestrator/prompt-builder";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContextBuilderInput = {
  taskType: AiTaskType;
  availableData: Record<string, string | null>;
};

export type ContextBuilderOutput = {
  assembledContext: Record<string, string>;
  totalCharacters: number;
  totalTokens: number;
  omittedFields: string[];
  truncatedFields: string[];
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Assembles the minimum context for an AI task, enforcing the budget
 * defined in the task registry expressed in token-equivalent units.
 *
 * The maxContextCharacters value from the registry is converted to tokens
 * using the standard estimation function (chars / 4) for consistent budgeting
 * across the system.
 *
 * Algorithm:
 * 1. Retrieve requiredContextFields from registry (ordered by priority: first = highest)
 * 2. Collect all available fields (skip null/empty without error)
 * 3. Convert maxContextCharacters to token budget using estimateTokens
 * 4. If total tokens exceed budget:
 *    - Remove fields from the end (lowest priority) until within budget
 *    - If removing the next field would overshoot, truncate it instead
 * 5. Never include fields not in requiredContextFields
 *
 * Validates: Requirement 17.2
 */
export function buildTaskContext(input: ContextBuilderInput): ContextBuilderOutput {
  const config = getTaskConfig(input.taskType);
  const { requiredContextFields, maxContextCharacters } = config;

  // Express maxContextCharacters in token-equivalent units (Requirement 17.2)
  const tokenBudget = estimateTokens("x".repeat(maxContextCharacters));

  // Step 1 & 2: Collect available fields in priority order (only those in requiredContextFields)
  const availableFields: { key: string; value: string }[] = [];

  for (const field of requiredContextFields) {
    const value = input.availableData[field];

    // Skip unavailable (null, undefined, or empty string) fields without error
    if (value === null || value === undefined || value === "") {
      continue;
    }

    availableFields.push({ key: field, value });
  }

  // Calculate totals
  const totalChars = availableFields.reduce((sum, f) => sum + f.value.length, 0);
  const totalTokens = estimateTokens(availableFields.map((f) => f.value).join(""));

  // If within budget, return all available fields
  if (totalTokens <= tokenBudget) {
    const assembledContext: Record<string, string> = {};
    for (const f of availableFields) {
      assembledContext[f.key] = f.value;
    }

    // Omitted fields are required fields that were unavailable
    const omittedFields = requiredContextFields.filter(
      (field) => !assembledContext[field],
    );

    return {
      assembledContext,
      totalCharacters: totalChars,
      totalTokens,
      omittedFields,
      truncatedFields: [],
    };
  }

  // Step 3: Truncation — remove fields from the end (lowest priority) until within budget
  const omittedFields: string[] = [];
  const truncatedFields: string[] = [];

  // Work with a mutable copy of available fields
  const included = [...availableFields];

  // Remove from the end until we're within budget or can truncate
  while (included.length > 0) {
    const currentTokens = estimateTokens(included.map((f) => f.value).join(""));

    if (currentTokens <= tokenBudget) {
      break;
    }

    // Calculate tokens without the last (lowest priority) field
    const lastField = included[included.length - 1]!;
    const withoutLast = included.slice(0, -1);
    const tokensWithoutLast = withoutLast.length > 0
      ? estimateTokens(withoutLast.map((f) => f.value).join(""))
      : 0;

    if (tokensWithoutLast <= tokenBudget) {
      // Truncating the last field can bring us within budget
      const remainingTokenBudget = tokenBudget - tokensWithoutLast;
      // Convert remaining token budget back to approximate character allowance
      const allowedChars = remainingTokenBudget * 4;

      if (allowedChars > 0) {
        // Truncate the field to fit
        included[included.length - 1] = {
          key: lastField.key,
          value: lastField.value.slice(0, allowedChars),
        };
        truncatedFields.push(lastField.key);
      } else {
        // No room at all — fully omit
        included.pop();
        omittedFields.push(lastField.key);
      }
      break;
    } else {
      // Fully remove the last field
      included.pop();
      omittedFields.push(lastField.key);
    }
  }

  // Build the output
  const assembledContext: Record<string, string> = {};
  for (const f of included) {
    assembledContext[f.key] = f.value;
  }

  const finalChars = included.reduce((sum, f) => sum + f.value.length, 0);
  const finalTokens = estimateTokens(included.map((f) => f.value).join(""));

  // Also include required fields that were unavailable in omittedFields
  const unavailableFields = requiredContextFields.filter(
    (field) =>
      !assembledContext[field] && !omittedFields.includes(field),
  );

  return {
    assembledContext,
    totalCharacters: finalChars,
    totalTokens: finalTokens,
    omittedFields: [...omittedFields, ...unavailableFields],
    truncatedFields,
  };
}
