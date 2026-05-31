import type { Node, Edge } from "@xyflow/react";

import type { WorkflowNode, WorkflowEdge } from "./types";
import { triggerLabels, actionLabels } from "./definitions";

export function serializeGraph(nodes: WorkflowNode[], edges: WorkflowEdge[]): unknown {
  return {
    nodes: nodes.map((n, idx) => ({
      id: n.id,
      type: n.type,
      position: n.position ?? { x: 0, y: idx * 150 },
      data: { label: n.label, ...n.config },
    })),
    edges: edges.map((e, idx) => ({
      id: `edge-${idx}`,
      source: e.source,
      target: e.target,
    })),
  };
}

export function deserializeGraph(actions: unknown): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  if (!actions || typeof actions !== "object") return { nodes: [], edges: [] };
  const graph = actions as { nodes?: unknown[]; edges?: unknown[] };
  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) return { nodes: [], edges: [] };

  const nodes: WorkflowNode[] = graph.nodes.map((raw: unknown, idx: number) => {
    const n = raw as { id?: string; type?: string; position?: { x: number; y: number }; data?: Record<string, unknown> };
    const nodeType = (n.type ?? "trigger") as WorkflowNode["type"];
    const data = n.data ?? {};
    const label = (data.label as string) ?? (data.triggerType as string) ?? (data.actionType as string) ?? nodeType;
    const { label: _label, ...config } = data;
    return {
      id: n.id ?? `node-${Date.now()}`,
      type: nodeType,
      label,
      config,
      position: n.position ?? { x: 0, y: idx * 180 },
    };
  });

  const edges: WorkflowEdge[] = Array.isArray(graph.edges)
    ? graph.edges.map((raw: unknown) => {
        const e = raw as { source?: string; target?: string };
        return { source: e.source ?? "", target: e.target ?? "" };
      })
    : [];

  return { nodes, edges };
}

export function buildEdges(nodes: WorkflowNode[]): WorkflowEdge[] {
  return nodes.slice(0, -1).map((n, i) => ({
    source: n.id,
    target: nodes[i + 1]!.id,
  }));
}

/**
 * Pull conditions out of condition nodes in the graph so the dispatcher
 * can evaluate them against the trigger payload at runtime. Only well-formed
 * { field, operator, value } entries are kept; partially configured nodes
 * are skipped silently while the user finishes editing.
 */
export function extractConditionsFromNodes(
  nodes: WorkflowNode[],
): Array<{ field: string; operator: string; value: string | number | boolean }> | null {
  const out: Array<{
    field: string;
    operator: string;
    value: string | number | boolean;
  }> = [];

  for (const node of nodes) {
    if (node.type !== "condition") continue;
    const field = (node.config?.field as string | undefined)?.trim();
    const operator = (node.config?.operator as string | undefined) ?? "eq";
    const rawValue = node.config?.value;
    if (!field || rawValue === undefined || rawValue === null || rawValue === "") {
      continue;
    }
    let value: string | number | boolean = String(rawValue);
    if (typeof rawValue === "number" || typeof rawValue === "boolean") {
      value = rawValue;
    } else if (typeof rawValue === "string" && rawValue !== "" && !Number.isNaN(Number(rawValue))) {
      // Coerce numeric-looking strings so gt/gte/lt/lte work as expected.
      value = Number(rawValue);
    }
    out.push({ field, operator, value });
  }

  return out.length > 0 ? out : null;
}

/**
 * Pull the first delay node's config so the dispatcher schedules execution
 * via the scheduled jobs queue. Multiple delay nodes are not supported by
 * the current rule schema (single delay column), so only the first valid
 * delay is honored.
 */
export function extractDelayFromNodes(
  nodes: WorkflowNode[],
): { unit: "minutes" | "hours" | "days"; value: number } | null {
  for (const node of nodes) {
    if (node.type !== "delay") continue;
    const unit = node.config?.unit as string | undefined;
    const valueRaw = node.config?.value;
    const value =
      typeof valueRaw === "number"
        ? valueRaw
        : typeof valueRaw === "string"
          ? Number(valueRaw)
          : NaN;
    if (
      (unit === "minutes" || unit === "hours" || unit === "days") &&
      Number.isFinite(value) &&
      value >= 1
    ) {
      return { unit, value: Math.floor(value) };
    }
  }
  return null;
}

/**
 * Reconstructs visual builder nodes from a rule stored in the legacy flat
 * format (actions = ActionConfig[] plus optional `conditions` and `delay`
 * columns). Used when opening a preset/onboarding-default rule in the
 * visual builder so existing config is visible and editable.
 */
/** Graph nodes for the visual builder from a list item (graph or flat rule). */
export function resolveWorkflowNodesFromAutomation(automation: {
  triggerType: string;
  actions: unknown;
  conditions: unknown;
  delay: unknown;
}): WorkflowNode[] {
  const { nodes: savedNodes } = deserializeGraph(automation.actions);
  if (savedNodes.length > 0) {
    return savedNodes;
  }
  return reconstructNodesFromFlatRule(automation);
}

export function reconstructNodesFromFlatRule(automation: {
  triggerType: string;
  actions: unknown;
  conditions: unknown;
  delay: unknown;
}): WorkflowNode[] {
  const nodes: WorkflowNode[] = [];
  let idx = 0;

  nodes.push({
    id: `trigger-${idx++}`,
    type: "trigger",
    label: triggerLabels[automation.triggerType] ?? automation.triggerType,
    config: { triggerType: automation.triggerType },
  });

  if (Array.isArray(automation.conditions)) {
    for (const raw of automation.conditions) {
      const c = raw as { field?: unknown; operator?: unknown; value?: unknown };
      if (typeof c?.field !== "string") continue;
      nodes.push({
        id: `condition-${idx++}`,
        type: "condition",
        label: "Condition",
        config: {
          field: c.field,
          operator: typeof c.operator === "string" ? c.operator : "eq",
          value: c.value as string | number | boolean | undefined,
        },
      });
    }
  }

  if (
    automation.delay &&
    typeof automation.delay === "object" &&
    "unit" in (automation.delay as Record<string, unknown>) &&
    "value" in (automation.delay as Record<string, unknown>)
  ) {
    const d = automation.delay as { unit: string; value: number };
    nodes.push({
      id: `delay-${idx++}`,
      type: "delay",
      label: `${d.value} ${d.unit}`,
      config: { unit: d.unit, value: d.value },
    });
  }

  if (Array.isArray(automation.actions)) {
    for (const raw of automation.actions) {
      const a = raw as { type?: unknown } & Record<string, unknown>;
      if (typeof a?.type !== "string") continue;
      const { type, ...rest } = a;
      nodes.push({
        id: `action-${idx++}`,
        type: "action",
        label: actionLabels[type] ?? type,
        config: { actionType: type, ...rest },
      });
    }
  }

  return nodes;
}

/** Convert internal WorkflowNode[] to React Flow Node[] format */
export function toFlowNodes(nodes: WorkflowNode[], selectedNodeId: string | null): Node[] {
  const flowNodes: Node[] = nodes.map((n, idx) => ({
    id: n.id,
    type: n.type,
    position: n.position ?? { x: 0, y: idx * 180 },
    selected: n.id === selectedNodeId,
    data: {
      label: n.label,
      nodeType: n.type,
      config: n.config,
    },
  }));

  // Add the "+" button as a special node at the end
  const lastNode = nodes[nodes.length - 1];
  const addNodeY = lastNode?.position ? lastNode.position.y + 180 : nodes.length * 180;
  flowNodes.push({
    id: "__add_node__",
    type: "add",
    position: { x: lastNode?.position?.x ?? 0, y: addNodeY },
    data: {},
    selectable: false,
    draggable: false,
  });

  return flowNodes;
}

/** Convert internal WorkflowEdge[] to React Flow Edge[] format */
export function toFlowEdges(edges: WorkflowEdge[], nodes: WorkflowNode[]): Edge[] {
  const flowEdges: Edge[] = edges.map((e, idx) => ({
    id: `edge-${idx}`,
    source: e.source,
    target: e.target,
    type: "automation",
  }));

  // Add edge from last node to the add button
  if (nodes.length > 0) {
    flowEdges.push({
      id: "edge-to-add",
      source: nodes[nodes.length - 1]!.id,
      target: "__add_node__",
      type: "automation",
      style: { strokeDasharray: "5 5", opacity: 0.4 },
    });
  }

  return flowEdges;
}
