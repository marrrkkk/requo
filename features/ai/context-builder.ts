import { getTaskConfig, type AiTaskType } from "./task-registry";

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
  omittedFields: string[];
  truncatedFields: string[];
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Assembles the minimum context for an AI task, enforcing the character budget
 * defined in the task registry.
 *
 * Algorithm:
 * 1. Retrieve requiredContextFields from registry (ordered by priority: first = highest)
 * 2. Collect all available fields (skip null/empty without error)
 * 3. If total exceeds maxContextCharacters:
 *    - Remove fields from the end (lowest priority) until within budget
 *    - If removing the next field would overshoot, truncate it instead
 * 4. Never include fields not in requiredContextFields
 */
export function buildTaskContext(input: ContextBuilderInput): ContextBuilderOutput {
  const config = getTaskConfig(input.taskType);
  const { requiredContextFields, maxContextCharacters } = config;

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

  // Calculate total characters
  const totalChars = availableFields.reduce((sum, f) => sum + f.value.length, 0);

  // If within budget, return all available fields
  if (totalChars <= maxContextCharacters) {
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
    const currentTotal = included.reduce((sum, f) => sum + f.value.length, 0);

    if (currentTotal <= maxContextCharacters) {
      break;
    }

    // Calculate total without the last (lowest priority) field
    const lastField = included[included.length - 1]!;
    const totalWithoutLast = currentTotal - lastField.value.length;

    if (totalWithoutLast <= maxContextCharacters) {
      // Truncating the last field can bring us within budget
      const allowedChars = maxContextCharacters - totalWithoutLast;

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

  const finalTotal = included.reduce((sum, f) => sum + f.value.length, 0);

  // Also include required fields that were unavailable in omittedFields
  const unavailableFields = requiredContextFields.filter(
    (field) =>
      !assembledContext[field] && !omittedFields.includes(field),
  );

  return {
    assembledContext,
    totalCharacters: finalTotal,
    omittedFields: [...omittedFields, ...unavailableFields],
    truncatedFields,
  };
}
