"use client";

import { useCallback, useState } from "react";
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";

export type WorkflowNodeData = {
  label: string;
  nodeType: "trigger" | "condition" | "delay" | "action";
  config?: Record<string, unknown>;
  /** Validation errors for this node, populated after running validateWorkflow */
  errors?: string[];
};

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;

export type WorkflowState = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
};

export type UseWorkflowStateReturn = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  onNodesChange: OnNodesChange<WorkflowNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  selectNode: (nodeId: string | null) => void;
  addNode: (node: WorkflowNode) => void;
  removeNode: (nodeId: string) => void;
  getState: () => WorkflowState;
  setState: (state: WorkflowState) => void;
};

export function useWorkflowState(
  initialState?: Partial<WorkflowState>
): UseWorkflowStateReturn {
  const [nodes, setNodes] = useState<WorkflowNode[]>(
    initialState?.nodes ?? []
  );
  const [edges, setEdges] = useState<WorkflowEdge[]>(
    initialState?.edges ?? []
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    initialState?.selectedNodeId ?? null
  );

  const onNodesChange: OnNodesChange<WorkflowNode> = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect: OnConnect = useCallback((connection) => {
    setEdges((eds) => addEdge(connection, eds));
  }, []);

  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const addNode = useCallback((node: WorkflowNode) => {
    setNodes((nds) => [...nds, node]);
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
    );
    setSelectedNodeId((current) => (current === nodeId ? null : current));
  }, []);

  const getState = useCallback(
    (): WorkflowState => ({ nodes, edges, selectedNodeId }),
    [nodes, edges, selectedNodeId]
  );

  const setState = useCallback((state: WorkflowState) => {
    setNodes(state.nodes);
    setEdges(state.edges);
    setSelectedNodeId(state.selectedNodeId);
  }, []);

  return {
    nodes,
    edges,
    selectedNodeId,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setNodes,
    setEdges,
    selectNode,
    addNode,
    removeNode,
    getState,
    setState,
  };
}
