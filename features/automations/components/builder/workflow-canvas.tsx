"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  type IsValidConnection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { TriggerNode } from "./nodes/trigger-node";
import { ConditionNode } from "./nodes/condition-node";
import { DelayNode } from "./nodes/delay-node";
import { ActionNode } from "./nodes/action-node";
import { AutomationEdge } from "./edges/automation-edge";
import { WorkflowToolbar } from "./panels/workflow-toolbar";
import {
  useWorkflowState,
  type WorkflowNode,
  type WorkflowState,
} from "./hooks/use-workflow-state";
import { useUndoRedo } from "./hooks/use-undo-redo";

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  delay: DelayNode,
  action: ActionNode,
};

const edgeTypes: EdgeTypes = {
  automation: AutomationEdge,
};

export type WorkflowCanvasProps = {
  initialState?: Partial<WorkflowState>;
  onSave?: (state: WorkflowState) => void;
  onValidate?: (state: WorkflowState) => void;
  selectedNodeId?: string | null;
  onNodeSelect?: (nodeId: string | null) => void;
};

/**
 * Validates whether a proposed connection is allowed.
 * Rules:
 * - No self-connections
 * - Only one trigger node can exist as a source root (no connections from multiple triggers)
 * - Condition nodes may only have 2 outgoing edges (true/false handles)
 */
function createIsValidConnection(
  nodes: WorkflowNode[],
  edges: { source: string; sourceHandle?: string | null }[]
): IsValidConnection {
  return (connection) => {
    const source = connection.source;
    const target = connection.target;

    // No self-connections
    if (source === target) {
      return false;
    }

    // Check source node type
    const sourceNode = nodes.find((n) => n.id === source);
    if (!sourceNode) return false;

    // Only one trigger node allowed as a source in the entire graph.
    // If connecting FROM a trigger, ensure no other trigger is already connected as a source.
    if (sourceNode.data.nodeType === "trigger") {
      const existingTriggerSources = edges.filter((e) => {
        const node = nodes.find((n) => n.id === e.source);
        return node?.data.nodeType === "trigger" && node.id !== sourceNode.id;
      });
      if (existingTriggerSources.length > 0) {
        return false;
      }
    }

    // Condition nodes can only have 2 outgoing edges (true and false handles)
    if (sourceNode.data.nodeType === "condition") {
      const sourceHandle = connection.sourceHandle ?? null;
      const existingOutgoing = edges.filter(
        (e) =>
          e.source === sourceNode.id &&
          (e.sourceHandle ?? null) === sourceHandle
      );
      if (existingOutgoing.length > 0) {
        return false;
      }
    }

    return true;
  };
}

let nodeIdCounter = 0;
function generateNodeId() {
  nodeIdCounter += 1;
  return `node-${Date.now()}-${nodeIdCounter}`;
}

export function WorkflowCanvas({
  initialState,
  onSave,
  onValidate,
  onNodeSelect,
}: WorkflowCanvasProps) {
  const workflow = useWorkflowState(initialState);
  const undoRedo = useUndoRedo<WorkflowState>({
    initialState: {
      nodes: initialState?.nodes ?? [],
      edges: initialState?.edges ?? [],
      selectedNodeId: initialState?.selectedNodeId ?? null,
    },
  });

  const isValidConnection = useMemo(
    () => createIsValidConnection(workflow.nodes, workflow.edges),
    [workflow.nodes, workflow.edges]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: WorkflowNode) => {
      workflow.selectNode(node.id);
      onNodeSelect?.(node.id);
    },
    [workflow, onNodeSelect]
  );

  const handlePaneClick = useCallback(() => {
    workflow.selectNode(null);
    onNodeSelect?.(null);
  }, [workflow, onNodeSelect]);

  const handleAddNode = useCallback(
    (type: "trigger" | "condition" | "delay" | "action") => {
      const labels: Record<string, string> = {
        trigger: "Trigger",
        condition: "Condition",
        delay: "Delay",
        action: "Action",
      };

      const newNode: WorkflowNode = {
        id: generateNodeId(),
        type,
        position: { x: 250, y: (workflow.nodes.length + 1) * 120 },
        data: {
          label: labels[type],
          nodeType: type,
        },
      };

      workflow.addNode(newNode);
      undoRedo.pushState(workflow.getState());
    },
    [workflow, undoRedo]
  );

  const handleSave = useCallback(() => {
    onSave?.(workflow.getState());
  }, [onSave, workflow]);

  const handleValidate = useCallback(() => {
    onValidate?.(workflow.getState());
  }, [onValidate, workflow]);

  const handleUndo = useCallback(() => {
    const state = undoRedo.undo();
    if (state) {
      workflow.setState(state);
    }
  }, [undoRedo, workflow]);

  const handleRedo = useCallback(() => {
    const state = undoRedo.redo();
    if (state) {
      workflow.setState(state);
    }
  }, [undoRedo, workflow]);

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "automation" as const,
    }),
    []
  );

  return (
    <div className="relative size-full">
      <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2">
        <WorkflowToolbar
          onAddNode={handleAddNode}
          onSave={handleSave}
          onValidate={handleValidate}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={undoRedo.canUndo}
          canRedo={undoRedo.canRedo}
        />
      </div>

      <ReactFlow
        nodes={workflow.nodes}
        edges={workflow.edges}
        onNodesChange={workflow.onNodesChange}
        onEdgesChange={workflow.onEdgesChange}
        onConnect={workflow.onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        isValidConnection={isValidConnection}
        fitView
        deleteKeyCode="Delete"
      >
        <Background />
        <MiniMap
          className="!border !border-border !bg-surface-card"
          maskColor="rgba(0, 0, 0, 0.1)"
        />
        <Controls className="!border !border-border !bg-surface-card !shadow-sm" />
      </ReactFlow>
    </div>
  );
}
