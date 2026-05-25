import type { Condition } from "./types";

// ---------------------------------------------------------------------------
// Condition Evaluator (Requirement 2.3)
// Placeholder — full implementation in task 3.2
// ---------------------------------------------------------------------------

/**
 * Evaluates all conditions against the trigger payload using AND logic.
 * Returns true if all conditions pass or if no conditions exist.
 */
export function evaluateConditions(
  conditions: Condition[],
  payload: unknown,
): boolean {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every((condition) =>
    evaluateSingleCondition(condition, payload),
  );
}

function evaluateSingleCondition(
  condition: Condition,
  payload: unknown,
): boolean {
  const value = resolveFieldPath(condition.field, payload);

  switch (condition.operator) {
    case "eq":
      return value === condition.value;
    case "neq":
      return value !== condition.value;
    case "gt":
      return typeof value === "number" && value > Number(condition.value);
    case "gte":
      return typeof value === "number" && value >= Number(condition.value);
    case "lt":
      return typeof value === "number" && value < Number(condition.value);
    case "lte":
      return typeof value === "number" && value <= Number(condition.value);
    case "contains":
      return (
        typeof value === "string" &&
        value.toLowerCase().includes(String(condition.value).toLowerCase())
      );
    case "not_contains":
      return (
        typeof value === "string" &&
        !value.toLowerCase().includes(String(condition.value).toLowerCase())
      );
    default:
      return false;
  }
}

/**
 * Resolves a dot-path field (e.g., "amount", "customer.name") against the payload.
 */
function resolveFieldPath(
  path: string,
  payload: unknown,
): unknown {
  if (!payload || typeof payload !== "object") return undefined;

  const parts = path.split(".");
  let current: unknown = payload;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}
