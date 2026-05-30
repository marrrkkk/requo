"use client";

import { useState, useCallback, useTransition, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Minus,
  Maximize2,
  Zap,
  ArrowLeft,
  LayoutTemplate,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Handle,
  Position,
  useReactFlow,
  applyNodeChanges,
  type Node,
  type NodeTypes,
  type EdgeTypes,
  type OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { AutomationListItem } from "../../queries";
import { createAutomation, updateAutomation, deleteAutomation } from "../../mutations";
import type { TriggerType } from "../../types";

import { TriggerNode } from "../builder/nodes/trigger-node";
import { ActionNode } from "../builder/nodes/action-node";
import { ConditionNode } from "../builder/nodes/condition-node";
import { DelayNode } from "../builder/nodes/delay-node";
import { AutomationEdge } from "../builder/edges/automation-edge";

import type { ViewMode, BuilderTab, SidebarPanel, WorkflowNode, AutomationsWorkspaceProps } from "./types";
import { triggerLabels } from "./definitions";
import {
  serializeGraph,
  buildEdges,
  extractConditionsFromNodes,
  extractDelayFromNodes,
  resolveWorkflowNodesFromAutomation,
  toFlowNodes,
  toFlowEdges,
} from "./graph-utils";
import { AutomationListView } from "./automation-list-view";
import { TriggerPickerPanel } from "./trigger-picker-panel";
import { NodeConfigPanel } from "./node-config-panel";
import { NextStepPickerPanel } from "./next-step-picker-panel";
import { RunsTabContent } from "./runs-tab";

// ---------------------------------------------------------------------------
// Add Node (+ button rendered as a React Flow node)
// ---------------------------------------------------------------------------

function AddNodeComponent() {
  return (
    <div className="flex size-9 items-center justify-center rounded-full border-2 border-dashed border-primary/50 bg-card text-primary transition-colors hover:border-primary hover:bg-primary/5">
      <Handle type="target" position={Position.Top} className="!size-0 !border-0 !bg-transparent" />
      <Plus className="size-4" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Toolbar (centered, horizontal, shadcn-styled)
// ---------------------------------------------------------------------------

function CanvasToolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-border bg-card p-1 shadow-sm">
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => zoomIn()}
        aria-label="Zoom in"
      >
        <Plus className="size-3.5" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => zoomOut()}
        aria-label="Zoom out"
      >
        <Minus className="size-3.5" />
      </Button>
      <div className="mx-0.5 h-4 w-px bg-border" />
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => fitView({ padding: 0.3 })}
        aria-label="Fit view"
      >
        <Maximize2 className="size-3.5" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// React Flow Node/Edge Types
// ---------------------------------------------------------------------------

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
  add: AddNodeComponent,
};

const edgeTypes: EdgeTypes = {
  automation: AutomationEdge,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AutomationsWorkspace({
  automations,
  plan,
  limit,
  hasBuilderAccess,
  businessSlug,
  selectedAutomationId,
  businessType,
  stats,
}: AutomationsWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [view, setView] = useState<ViewMode>(
    selectedAutomationId ? "builder" : "list",
  );
  const [builderTab, setBuilderTab] = useState<BuilderTab>("editor");
  const [editingId, setEditingId] = useState<string | null>(
    selectedAutomationId ?? null,
  );
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [isEnabled, setIsEnabled] = useState(false);

  // Builder state
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [sidebarPanel, setSidebarPanel] = useState<SidebarPanel | null>(
    selectedAutomationId ? null : { type: "trigger-picker" },
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Debounce ref for auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing automation into builder when selectedAutomationId is set
  useEffect(() => {
    if (selectedAutomationId) {
      const existing = automations.find((a) => a.id === selectedAutomationId);
      if (existing) {
        setEditingId(existing.id);
        setWorkflowName(existing.name);
        setIsEnabled(existing.enabled);
        setView("builder");
        setBuilderTab("editor");
        const workflowNodes = resolveWorkflowNodesFromAutomation(existing);
        setNodes(workflowNodes);
        setSidebarPanel({
          type: "node-config",
          nodeId: workflowNodes[0]?.id ?? "trigger-1",
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAutomationId]);

  // ---------------------------------------------------------------------------
  // Auto-save (debounced)
  // ---------------------------------------------------------------------------

  const autoSave = useCallback(
    (updatedNodes: WorkflowNode[], name?: string, enabled?: boolean) => {
      if (!editingId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        const edges = buildEdges(updatedNodes);
        const graph = serializeGraph(updatedNodes, edges);
        const triggerNode = updatedNodes.find((n) => n.type === "trigger");
        const triggerType = triggerNode?.config?.triggerType as string | undefined;
        const conditions = extractConditionsFromNodes(updatedNodes);
        const delay = extractDelayFromNodes(updatedNodes);

        startTransition(async () => {
          const data: Record<string, unknown> = {
            actions: graph,
            // Send null explicitly so the backend clears removed conditions/delays.
            conditions,
            delay,
          };
          if (name !== undefined) data.name = name;
          if (enabled !== undefined) data.enabled = enabled;
          if (triggerType) data.triggerType = triggerType;
          await updateAutomation(editingId, data);
        });
      }, 500);
    },
    [editingId, startTransition],
  );

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function handleNewWorkflow() {
    setNodes([]);
    setEditingId(null);
    setWorkflowName("Untitled Workflow");
    setIsEnabled(false);
    setSidebarPanel({ type: "trigger-picker" });
    setBuilderTab("editor");
    setView("builder");
  }

  function handleEditWorkflow(automation: AutomationListItem) {
    setEditingId(automation.id);
    setWorkflowName(automation.name);
    setIsEnabled(automation.enabled);

    const workflowNodes = resolveWorkflowNodesFromAutomation(automation);
    setNodes(workflowNodes);
    setSidebarPanel({
      type: "node-config",
      nodeId: workflowNodes[0]?.id ?? "trigger-1",
    });
    setBuilderTab("editor");
    setView("builder");
  }

  function handleBackToList() {
    setView("list");
    setEditingId(null);
    setNodes([]);
    setSidebarPanel(null);
    router.refresh();
  }

  function handleSelectTrigger(triggerId: TriggerType) {
    const label = triggerLabels[triggerId] ?? triggerId;
    const triggerNode: WorkflowNode = {
      id: `trigger-${Date.now()}`,
      type: "trigger",
      label,
      config: { triggerType: triggerId },
    };
    setNodes([triggerNode]);
    setSidebarPanel({ type: "node-config", nodeId: triggerNode.id });

    startTransition(async () => {
      const edges = buildEdges([triggerNode]);
      const graph = serializeGraph([triggerNode], edges);
      const result = await createAutomation({
        name: "Untitled Workflow",
        triggerType: triggerId,
        actions: graph,
        enabled: false,
        priority: 0,
      });
      if (result.id) {
        setEditingId(result.id);
        toast.success("Draft workflow created");
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  function handleChangeTrigger(triggerId: TriggerType) {
    const label = triggerLabels[triggerId] ?? triggerId;
    setNodes((prev) => {
      const updated = prev.map((n) =>
        n.type === "trigger"
          ? { ...n, label, config: { ...n.config, triggerType: triggerId } }
          : n,
      );
      autoSave(updated);
      return updated;
    });
  }

  function handleClickNode(node: WorkflowNode) {
    setSidebarPanel({ type: "node-config", nodeId: node.id });
  }

  function handleClickAddBlock() {
    const lastNode = nodes[nodes.length - 1];
    setSidebarPanel({
      type: "next-step-picker",
      afterNodeId: lastNode?.id ?? "root",
    });
  }

  function handleSelectBlock(blockType: string, label: string, nodeType: WorkflowNode["type"]) {
    let config: Record<string, unknown>;
    if (nodeType === "action") {
      config = { actionType: blockType };
    } else if (blockType === "delay") {
      config = { unit: "hours", value: 1 };
    } else if (blockType === "wait_until") {
      config = { waitFor: "quote.viewed", unit: "event" };
    } else if (blockType === "schedule_for") {
      config = { time: "09:00", timezone: "local" };
    } else if (blockType === "condition_source") {
      config = { field: "inquiry.source", operator: "eq", value: "" };
    } else if (blockType === "condition_contact_method") {
      config = { field: "inquiry.contactMethod", operator: "eq", value: "" };
    } else if (blockType === "condition_form") {
      config = { field: "inquiry.formId", operator: "eq", value: "" };
    } else if (blockType === "condition_name_contains") {
      config = { field: "inquiry.name", operator: "contains", value: "" };
    } else if (blockType === "condition_tag") {
      config = { field: "inquiry.tag", operator: "eq", value: "" };
    } else if (blockType === "condition_amount") {
      config = { field: "quote.amount", operator: "gte", value: "" };
    } else if (blockType === "condition_days_inactive") {
      config = { field: "lastActivity.daysAgo", operator: "gte", value: "3" };
    } else if (blockType === "condition_quote_viewed") {
      config = { field: "quote.viewed", operator: "eq", value: "true" };
    } else if (blockType === "condition_has_attachment") {
      config = { field: "inquiry.hasAttachment", operator: "eq", value: "true" };
    } else if (blockType === "condition_repeat_customer") {
      config = { field: "contact.isRepeat", operator: "eq", value: "true" };
    } else if (blockType === "condition_business_hours") {
      config = { field: "time.isBusinessHours", operator: "eq", value: "true" };
    } else {
      config = { field: "", operator: "eq", value: "" };
    }

    const newNode: WorkflowNode = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      label,
      config,
    };
    setNodes((prev) => {
      const updated = [...prev, newNode];
      autoSave(updated);
      return updated;
    });
    setSidebarPanel({ type: "node-config", nodeId: newNode.id });
  }

  function handleDeleteNode(nodeId: string) {
    setNodes((prev) => {
      const updated = prev.filter((n) => n.id !== nodeId);
      autoSave(updated);
      return updated;
    });
    setSidebarPanel(nodes.length > 1 ? { type: "node-config", nodeId: nodes[0]!.id } : null);
  }

  function handleUpdateNodeConfig(nodeId: string, config: Record<string, unknown>) {
    setNodes((prev) => {
      const updated = prev.map((n) => (n.id === nodeId ? { ...n, config: { ...n.config, ...config } } : n));
      autoSave(updated);
      return updated;
    });
  }

  function handleNameBlur() {
    if (editingId && workflowName.trim().length >= 2) {
      // Save name immediately (not debounced) to prevent losing the rename
      startTransition(async () => {
        await updateAutomation(editingId, { name: workflowName.trim() });
      });
    }
  }

  function handleTogglePublish() {
    const next = !isEnabled;
    setIsEnabled(next);
    if (editingId) {
      startTransition(async () => {
        const result = await updateAutomation(editingId, { enabled: next });
        if (result.error) {
          toast.error(result.error);
          setIsEnabled(!next);
        } else {
          toast.success(next ? "Workflow published" : "Workflow unpublished");
        }
      });
    }
  }

  function handlePublish() {
    if (!editingId) return;
    setIsEnabled(true);
    startTransition(async () => {
      const result = await updateAutomation(editingId, { enabled: true });
      if (result.error) {
        toast.error(result.error);
        setIsEnabled(false);
      } else {
        toast.success("Workflow published");
      }
    });
  }

  function handleDeleteWorkflow() {
    if (!editingId) return;
    startTransition(async () => {
      const result = await deleteAutomation(editingId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Workflow deleted");
        handleBackToList();
      }
    });
  }

  // React Flow node click handler
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.id === "__add_node__") {
        handleClickAddBlock();
        return;
      }
      const internalNode = nodes.find((n) => n.id === node.id);
      if (internalNode) {
        handleClickNode(internalNode);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes],
  );

  // Memoize flow nodes and edges
  const selectedNodeId = sidebarPanel?.type === "node-config" ? sidebarPanel.nodeId : null;
  const flowEdges = useMemo(() => toFlowEdges(buildEdges(nodes), nodes), [nodes]);

  // React Flow controlled nodes state (for drag/position changes)
  const [rfNodes, setRfNodes] = useState<Node[]>(() => toFlowNodes(nodes, selectedNodeId));

  // Track whether a drag is in progress to avoid clobbering rfNodes mid-drag
  const isDraggingRef = useRef(false);

  // Sync rfNodes when our internal nodes change (but not during drag)
  useEffect(() => {
    if (!isDraggingRef.current) {
      setRfNodes(toFlowNodes(nodes, selectedNodeId));
    }
  }, [nodes, selectedNodeId]);

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setRfNodes((nds) => applyNodeChanges(changes, nds));

    // Detect drag start/end
    const positionChanges = changes.filter(
      (c): c is Extract<typeof c, { type: "position" }> =>
        c.type === "position",
    );
    const relevantChanges = positionChanges.filter(
      (c) => c.id !== "__add_node__",
    );

    if (relevantChanges.length > 0) {
      // Track dragging state
      const anyDragging = relevantChanges.some((c) => c.dragging === true);
      const hasDragEnd = relevantChanges.some((c) => c.dragging === false);

      if (anyDragging) {
        isDraggingRef.current = true;
      }

      // Only sync positions to internal state on drag end
      if (hasDragEnd) {
        isDraggingRef.current = false;
        const changesWithPosition = relevantChanges.filter((c) => c.position);
        if (changesWithPosition.length > 0) {
          setNodes((prev) => {
            const updated = prev.map((n) => {
              const change = changesWithPosition.find((c) => c.id === n.id);
              if (change && change.position) {
                return { ...n, position: change.position };
              }
              return n;
            });
            autoSave(updated);
            return updated;
          });
        }
      }
    }
  }, [autoSave]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (view === "list") {
    return (
      <AutomationListView
        automations={automations}
        businessSlug={businessSlug}
        businessType={businessType}
        stats={stats}
        onNew={handleNewWorkflow}
        onEdit={handleEditWorkflow}
      />
    );
  }

  return (
    <div className="automations-builder-container flex overflow-hidden">
      {/* Canvas area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex h-11 shrink-0 items-center justify-between bg-surface-card px-4">
          <div className="flex items-center gap-3">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={handleBackToList}
              aria-label="Back to automations"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={handleNameBlur}
              className="h-7 w-48 rounded border-none bg-transparent px-1.5 text-sm font-medium outline-none ring-0 transition-colors hover:bg-muted/40 focus:bg-muted/50 focus:ring-1 focus:ring-primary/30"
              aria-label="Workflow name"
            />
            <Badge variant={isEnabled ? "default" : "secondary"} className="text-[0.65rem]">
              {isEnabled ? "Active" : "Draft"}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            {/* Builder tabs */}
            <div className="flex items-center rounded-md bg-muted/50 p-0.5">
              <button
                type="button"
                onClick={() => setBuilderTab("editor")}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium transition-colors",
                  builderTab === "editor"
                    ? "bg-surface-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setBuilderTab("runs")}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium transition-colors",
                  builderTab === "runs"
                    ? "bg-surface-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Runs
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isEnabled ? "Active" : "Inactive"}
              </span>
              <Switch checked={isEnabled} onCheckedChange={handleTogglePublish} />
            </div>
            {!isEnabled && (
              <Button size="xs" onClick={handlePublish} disabled={nodes.length === 0 || isPending}>
                Publish
              </Button>
            )}
          </div>
        </div>

        {/* Tab content */}
        {builderTab === "editor" ? (
          <div className="relative flex-1">
            {nodes.length === 0 ? (
              <div className="flex size-full items-center justify-center bg-muted/20 p-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-24 w-80 items-center justify-center rounded-xl border-2 border-dashed border-border/70 bg-card text-sm text-muted-foreground">
                    <Zap className="mr-2 size-4" /> Set a trigger in the sidebar
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="h-px w-12 bg-border" />
                    OR
                    <div className="h-px w-12 bg-border" />
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/${businessSlug}/automations/presets`}>
                      <LayoutTemplate className="size-3.5" />
                      Start with a template
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <ReactFlowProvider>
                <div className="relative h-full w-full" style={{ height: "100%" }}>
                  <ReactFlow
                    nodes={rfNodes}
                    edges={flowEdges}
                    onNodesChange={onNodesChange}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onNodeClick={onNodeClick}
                    onPaneClick={() => setSidebarPanel(null)}
                    fitView
                    fitViewOptions={{ padding: 0.3 }}
                    panOnDrag={true}
                    zoomOnScroll={true}
                    proOptions={{ hideAttribution: true }}
                    defaultEdgeOptions={{ type: "automation" }}
                  >
                    <Background />
                  </ReactFlow>
                  <CanvasToolbar />
                </div>
              </ReactFlowProvider>
            )}
          </div>
        ) : (
          <RunsTabContent automationId={editingId} businessSlug={businessSlug} />
        )}
      </div>

      {/* Right Sidebar — only visible in editor tab */}
      {builderTab === "editor" && (
        <aside
          className={cn(
            "flex shrink-0 border-l border-border bg-card transition-[width] duration-200 ease-in-out",
            sidebarOpen ? "w-80" : "w-10",
          )}
        >
          {/* Collapsed strip — toggle button always visible */}
          {!sidebarOpen && (
            <div className="flex w-10 flex-col items-center pt-3">
              <button
                type="button"
                aria-label="Expand panel"
                onClick={() => setSidebarOpen(true)}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <PanelRightOpen className="size-3.5" />
              </button>
            </div>
          )}

          {/* Expanded content */}
          {sidebarOpen && (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Collapse toggle at top of sidebar */}
              <div className="flex h-10 shrink-0 items-center justify-end border-b border-border px-2">
                <button
                  type="button"
                  aria-label="Collapse panel"
                  onClick={() => setSidebarOpen(false)}
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <PanelRightClose className="size-3.5" />
                </button>
              </div>

              {sidebarPanel?.type === "trigger-picker" && (
                <TriggerPickerPanel
                  onSelect={handleSelectTrigger}
                  businessSlug={businessSlug}
                />
              )}
              {sidebarPanel?.type === "node-config" && (
                <NodeConfigPanel
                  node={nodes.find((n) => n.id === sidebarPanel.nodeId) ?? null}
                  onAddNext={handleClickAddBlock}
                  onDelete={handleDeleteNode}
                  onUpdateConfig={handleUpdateNodeConfig}
                  onChangeTrigger={handleChangeTrigger}
                />
              )}
              {sidebarPanel?.type === "next-step-picker" && (
                <NextStepPickerPanel onSelect={handleSelectBlock} />
              )}
              {!sidebarPanel && (
                <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-muted-foreground">
                  Select a node or click + to add a step.
                </div>
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
