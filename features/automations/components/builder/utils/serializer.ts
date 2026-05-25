import type { WorkflowGraph } from "@/features/automations/types";
import type {
  WorkflowNode as ReactFlowWorkflowNode,
  WorkflowEdge as ReactFlowWorkflowEdge,
  WorkflowState,
} from "../hooks/use-workflow-state";

/**
 * Converts React Flow workflow state to the JSON format stored in the database.
 * The `actions` JSONB field uses a `{ nodes: [...], edges: [...] }` structure.
 */
export function serializeWorkflow(state: WorkflowState): WorkflowGraph {
  const nodes = state.nodes.map((node) => ({
    id: node.id,
    type: node.data.nodeType,
    position: node.position,
    data: {
      label: node.data.label,
      nodeType: node.data.nodeType,
      ...(node.data.config ? { config: node.data.config } : {}),
    } as Record<string, unknown>,
  }));

  const edges = state.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    ...(edge.sourceHandle ? { sourceHandle: edge.sourceHandle } : {}),
    ...(edge.targetHandle ? { targetHandle: edge.targetHandle } : {}),
    ...(edge.label ? { label: String(edge.label) } : {}),
  }));

  return { nodes, edges };
}

/**
 * Converts stored JSON back to React Flow state for the canvas.
 */
export function deserializeWorkflow(graph: WorkflowGraph): WorkflowState {
  const nodes: ReactFlowWorkflowNode[] = graph.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      label: (node.data.label as string) ?? "",
      nodeType: node.type as "trigger" | "condition" | "delay" | "action",
      ...(node.data.config
        ? { config: node.data.config as Record<string, unknown> }
        : {}),
    },
  }));

  const edges: ReactFlowWorkflowEdge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    ...(edge.sourceHandle ? { sourceHandle: edge.sourceHandle } : {}),
    ...(edge.targetHandle ? { targetHandle: edge.targetHandle } : {}),
    ...(edge.label ? { label: edge.label } : {}),
  }));

  return { nodes, edges, selectedNodeId: null };
}
