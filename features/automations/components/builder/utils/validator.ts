import type { WorkflowState } from "../hooks/use-workflow-state";

export type ValidationError = {
  nodeId?: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

/**
 * Validates a workflow state for completeness and correctness.
 *
 * Rules:
 * 1. Exactly one trigger node required
 * 2. Graph must be connected (all nodes reachable from trigger)
 * 3. No orphan nodes (nodes with no connections)
 * 4. All node configs must be complete
 * 5. Condition nodes must have exactly 2 outgoing edges (true/false)
 */
export function validateWorkflow(state: WorkflowState): ValidationResult {
  const errors: ValidationError[] = [];
  const { nodes, edges } = state;

  // Rule 1: Exactly one trigger node
  const triggerNodes = nodes.filter((n) => n.data.nodeType === "trigger");
  if (triggerNodes.length === 0) {
    errors.push({ message: "Workflow must have exactly one trigger node." });
  } else if (triggerNodes.length > 1) {
    for (const node of triggerNodes.slice(1)) {
      errors.push({
        nodeId: node.id,
        message: "Only one trigger node is allowed.",
      });
    }
  }

  // Rule 3: No orphan nodes (nodes with no connections)
  for (const node of nodes) {
    const hasConnection = edges.some(
      (e) => e.source === node.id || e.target === node.id
    );
    if (!hasConnection && nodes.length > 1) {
      errors.push({
        nodeId: node.id,
        message: `Node "${node.data.label}" has no connections.`,
      });
    }
  }

  // Rule 2: Graph must be connected (all nodes reachable from trigger)
  if (triggerNodes.length === 1 && nodes.length > 1) {
    const reachable = getReachableNodes(triggerNodes[0].id, edges);
    for (const node of nodes) {
      if (!reachable.has(node.id)) {
        errors.push({
          nodeId: node.id,
          message: `Node "${node.data.label}" is not reachable from the trigger.`,
        });
      }
    }
  }

  // Rule 4: All node configs must be complete
  for (const node of nodes) {
    const configErrors = validateNodeConfig(node.data.nodeType, node.data.config);
    for (const msg of configErrors) {
      errors.push({ nodeId: node.id, message: msg });
    }
  }

  // Rule 5: Condition nodes must have exactly 2 outgoing edges
  const conditionNodes = nodes.filter((n) => n.data.nodeType === "condition");
  for (const node of conditionNodes) {
    const outgoing = edges.filter((e) => e.source === node.id);
    if (outgoing.length !== 2) {
      errors.push({
        nodeId: node.id,
        message: `Condition node "${node.data.label}" must have exactly 2 outgoing edges (true/false). Found ${outgoing.length}.`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Returns a set of all node IDs reachable from the start node
 * via BFS traversal following edge direction.
 */
function getReachableNodes(
  startId: string,
  edges: WorkflowState["edges"]
): Set<string> {
  const reachable = new Set<string>();
  const queue = [startId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reachable.has(current)) continue;
    reachable.add(current);

    for (const edge of edges) {
      if (edge.source === current && !reachable.has(edge.target)) {
        queue.push(edge.target);
      }
    }
  }

  return reachable;
}

/**
 * Validates that a node's configuration is complete based on its type.
 */
function validateNodeConfig(
  nodeType: string,
  config?: Record<string, unknown>
): string[] {
  const errors: string[] = [];

  switch (nodeType) {
    case "trigger":
      if (!config?.triggerType) {
        errors.push("Trigger node must have a trigger type configured.");
      }
      break;
    case "condition":
      if (!config?.field) {
        errors.push("Condition node must have a field configured.");
      }
      if (!config?.operator) {
        errors.push("Condition node must have an operator configured.");
      }
      if (config?.value === undefined || config?.value === null || config?.value === "") {
        errors.push("Condition node must have a value configured.");
      }
      break;
    case "delay":
      if (!config?.value || !config?.unit) {
        errors.push("Delay node must have a duration configured.");
      }
      break;
    case "action":
      if (!config?.actionType) {
        errors.push("Action node must have an action type configured.");
      }
      break;
  }

  return errors;
}
