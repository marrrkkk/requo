"use client";

import { useState, useCallback, useTransition, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Zap,
  ArrowLeft,
  GitBranch,
  Clock,
  Play,
  Filter,
  LayoutTemplate,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  applyNodeChanges,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import {
  DashboardEmptyState,
} from "@/components/shared/dashboard-layout";
import { Field, FieldLabel, FieldContent, FieldGroup } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { BusinessPlan } from "@/lib/plans/plans";
import type { AutomationListItem } from "../queries";
import { createAutomation, updateAutomation, deleteAutomation } from "../mutations";
import type { TriggerType, ActionType } from "../types";
import { triggerTypes, actionTypes, delayUnits } from "../types";

import { TriggerNode } from "./builder/nodes/trigger-node";
import { ActionNode } from "./builder/nodes/action-node";
import { ConditionNode } from "./builder/nodes/condition-node";
import { DelayNode } from "./builder/nodes/delay-node";
import { AutomationEdge } from "./builder/edges/automation-edge";

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
// Types
// ---------------------------------------------------------------------------

type ViewMode = "list" | "builder";

type BuilderTab = "editor" | "runs";

type SidebarPanel =
  | { type: "trigger-picker" }
  | { type: "node-config"; nodeId: string }
  | { type: "next-step-picker"; afterNodeId: string };

type WorkflowNode = {
  id: string;
  type: "trigger" | "condition" | "delay" | "action";
  label: string;
  config: Record<string, unknown>;
};

type WorkflowEdge = {
  source: string;
  target: string;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type AutomationsWorkspaceProps = {
  automations: AutomationListItem[];
  plan: BusinessPlan;
  limit: number;
  hasBuilderAccess: boolean;
  businessSlug: string;
  selectedAutomationId?: string;
};

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
// Trigger & Block Definitions
// ---------------------------------------------------------------------------

const triggers: { id: TriggerType; label: string; group: string }[] = [
  { id: "inquiry.received", label: "Inquiry received", group: "Inquiries" },
  { id: "inquiry.qualified", label: "Inquiry qualified", group: "Inquiries" },
  { id: "inquiry.archived", label: "Inquiry archived", group: "Inquiries" },
  { id: "quote.created", label: "Quote created", group: "Quotes" },
  { id: "quote.sent", label: "Quote sent", group: "Quotes" },
  { id: "quote.viewed", label: "Quote viewed", group: "Quotes" },
  { id: "quote.accepted", label: "Quote accepted", group: "Quotes" },
  { id: "quote.rejected", label: "Quote rejected", group: "Quotes" },
  { id: "quote.expired", label: "Quote expired", group: "Quotes" },
  { id: "job.created", label: "Job created", group: "Jobs" },
  { id: "job.completed", label: "Job completed", group: "Jobs" },
  { id: "invoice.sent", label: "Invoice sent", group: "Invoices" },
  { id: "invoice.paid", label: "Invoice paid", group: "Invoices" },
  { id: "invoice.overdue", label: "Invoice overdue", group: "Invoices" },
  { id: "follow_up.due", label: "Follow-up due", group: "Follow-ups" },
  { id: "follow_up.overdue", label: "Follow-up overdue", group: "Follow-ups" },
];

const actionBlocks: { id: ActionType; label: string; icon: typeof Play; group: string }[] = [
  { id: "create_follow_up", label: "Create follow-up", icon: Play, group: "Actions" },
  { id: "send_email", label: "Send email", icon: Play, group: "Actions" },
  { id: "send_notification", label: "Send notification", icon: Play, group: "Actions" },
  { id: "update_inquiry_status", label: "Update inquiry status", icon: Play, group: "Actions" },
  { id: "update_quote_status", label: "Update quote status", icon: Play, group: "Actions" },
  { id: "archive_inquiry", label: "Archive inquiry", icon: Play, group: "Actions" },
  { id: "create_job_from_quote", label: "Create job from quote", icon: Play, group: "Actions" },
  { id: "generate_invoice", label: "Generate invoice", icon: Play, group: "Actions" },
  { id: "generate_draft_quote", label: "Generate draft quote", icon: Play, group: "Actions" },
];

const conditionBlocks = [
  { id: "condition", label: "If / else", icon: Filter, group: "Conditions" },
];

const delayBlocks = [
  { id: "delay", label: "Delay", icon: Clock, group: "Delays" },
];

const triggerLabels: Record<string, string> = Object.fromEntries(
  triggers.map((t) => [t.id, t.label]),
);

const actionLabels: Record<string, string> = Object.fromEntries(
  actionBlocks.map((a) => [a.id, a.label]),
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function serializeGraph(nodes: WorkflowNode[], edges: WorkflowEdge[]): unknown {
  return {
    nodes: nodes.map((n, idx) => ({
      id: n.id,
      type: n.type,
      position: { x: 0, y: idx * 150 },
      data: { label: n.label, ...n.config },
    })),
    edges: edges.map((e, idx) => ({
      id: `edge-${idx}`,
      source: e.source,
      target: e.target,
    })),
  };
}

function deserializeGraph(actions: unknown): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  if (!actions || typeof actions !== "object") return { nodes: [], edges: [] };
  const graph = actions as { nodes?: unknown[]; edges?: unknown[] };
  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) return { nodes: [], edges: [] };

  const nodes: WorkflowNode[] = graph.nodes.map((raw: unknown) => {
    const n = raw as { id?: string; type?: string; data?: Record<string, unknown> };
    const nodeType = (n.type ?? "trigger") as WorkflowNode["type"];
    const data = n.data ?? {};
    const label = (data.label as string) ?? (data.triggerType as string) ?? (data.actionType as string) ?? nodeType;
    const { label: _label, ...config } = data;
    return {
      id: n.id ?? `node-${Date.now()}`,
      type: nodeType,
      label,
      config,
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

function buildEdges(nodes: WorkflowNode[]): WorkflowEdge[] {
  return nodes.slice(0, -1).map((n, i) => ({
    source: n.id,
    target: nodes[i + 1]!.id,
  }));
}

/** Convert internal WorkflowNode[] to React Flow Node[] format */
function toFlowNodes(nodes: WorkflowNode[], selectedNodeId: string | null): Node[] {
  const flowNodes: Node[] = nodes.map((n, idx) => ({
    id: n.id,
    type: n.type,
    position: { x: 0, y: idx * 180 },
    selected: n.id === selectedNodeId,
    data: {
      label: n.label,
      nodeType: n.type,
      config: n.config,
    },
  }));

  // Add the "+" button as a special node at the end
  flowNodes.push({
    id: "__add_node__",
    type: "add",
    position: { x: 0, y: nodes.length * 180 },
    data: {},
    selectable: false,
    draggable: false,
  });

  return flowNodes;
}

/** Convert internal WorkflowEdge[] to React Flow Edge[] format */
function toFlowEdges(edges: WorkflowEdge[], nodes: WorkflowNode[]): Edge[] {
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

  // Debounce ref for auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing automation into builder when selectedAutomationId is set
  useEffect(() => {
    if (selectedAutomationId) {
      const existing = automations.find((a) => a.id === selectedAutomationId);
      if (existing) {
        setWorkflowName(existing.name);
        setIsEnabled(existing.enabled);
        const { nodes: savedNodes } = deserializeGraph(existing.actions);
        if (savedNodes.length > 0) {
          setNodes(savedNodes);
          setSidebarPanel({ type: "node-config", nodeId: savedNodes[0]!.id });
        } else {
          const triggerNode: WorkflowNode = {
            id: "trigger-1",
            type: "trigger",
            label: triggerLabels[existing.triggerType] ?? existing.triggerType,
            config: { triggerType: existing.triggerType },
          };
          setNodes([triggerNode]);
          setSidebarPanel({ type: "node-config", nodeId: "trigger-1" });
        }
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

        startTransition(async () => {
          const data: Record<string, unknown> = { actions: graph };
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

    const { nodes: savedNodes } = deserializeGraph(automation.actions);
    if (savedNodes.length > 0) {
      setNodes(savedNodes);
      setSidebarPanel({ type: "node-config", nodeId: savedNodes[0]!.id });
    } else {
      const triggerNode: WorkflowNode = {
        id: "trigger-1",
        type: "trigger",
        label: triggerLabels[automation.triggerType] ?? automation.triggerType,
        config: { triggerType: automation.triggerType },
      };
      setNodes([triggerNode]);
      setSidebarPanel({ type: "node-config", nodeId: "trigger-1" });
    }
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
    const newNode: WorkflowNode = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      label,
      config: nodeType === "action" ? { actionType: blockType } : nodeType === "delay" ? { unit: "hours", value: 1 } : { field: "", operator: "eq", value: "" },
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
      autoSave(nodes, workflowName.trim());
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
  const flowNodes = useMemo(() => toFlowNodes(nodes, selectedNodeId), [nodes, selectedNodeId]);
  const flowEdges = useMemo(() => toFlowEdges(buildEdges(nodes), nodes), [nodes]);

  // React Flow controlled nodes state (for drag/position changes)
  const [rfNodes, setRfNodes] = useState<Node[]>(flowNodes);

  // Sync rfNodes when our internal nodes change
  useEffect(() => {
    setRfNodes(toFlowNodes(nodes, selectedNodeId));
  }, [nodes, selectedNodeId]);

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setRfNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (view === "list") {
    return (
      <AutomationListView
        automations={automations}
        businessSlug={businessSlug}
        onNew={handleNewWorkflow}
        onEdit={handleEditWorkflow}
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Canvas area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-surface-card px-4">
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
              <Button size="sm" onClick={handlePublish} disabled={nodes.length === 0 || isPending}>
                Publish workflow
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
              <div className="h-full w-full" style={{ height: "100%" }}>
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
                  <Controls position="bottom-left" />
                </ReactFlow>
              </div>
            )}
          </div>
        ) : (
          <RunsTabContent />
        )}
      </div>

      {/* Right Sidebar — only visible in editor tab */}
      {builderTab === "editor" && (
        <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-surface-card">
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
        </aside>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Runs Tab Content
// ---------------------------------------------------------------------------

function RunsTabContent() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-12 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted/50">
          <Clock className="size-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium">No runs yet</h3>
        <p className="max-w-xs text-xs text-muted-foreground">
          This workflow hasn&apos;t been triggered. Execution history will appear here once it runs.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List View
// ---------------------------------------------------------------------------

function AutomationListView({
  automations,
  businessSlug,
  onNew,
  onEdit,
}: {
  automations: AutomationListItem[];
  businessSlug: string;
  onNew: () => void;
  onEdit: (a: AutomationListItem) => void;
}) {
  if (automations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12">
        <DashboardEmptyState
          variant="section"
          icon={GitBranch}
          title="Workflows"
          description="No workflows yet. Create your first automation to streamline your business."
          action={
            <Button size="sm" onClick={onNew}>
              <Plus className="size-3.5" />
              New workflow
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 p-0">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Automations</h1>
        <Button size="sm" onClick={onNew}>
          <Plus className="size-3.5" />
          New workflow
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
              <th className="px-6 py-3 text-left font-medium">Workflow</th>
              <th className="px-6 py-3 text-left font-medium">Trigger</th>
              <th className="px-6 py-3 text-left font-medium">Status</th>
              <th className="px-6 py-3 text-left font-medium">Last run</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {automations.map((automation) => (
              <tr
                key={automation.id}
                onClick={() => onEdit(automation)}
                className="cursor-pointer transition-colors hover:bg-muted/30"
              >
                <td className="px-6 py-3">
                  <span className="font-medium text-foreground">
                    {automation.name}
                  </span>
                </td>
                <td className="px-6 py-3 text-muted-foreground">
                  {triggerLabels[automation.triggerType] ?? automation.triggerType}
                </td>
                <td className="px-6 py-3">
                  <Badge
                    variant={automation.enabled ? "default" : "secondary"}
                    className="text-[0.65rem]"
                  >
                    {automation.enabled ? "Active" : "Draft"}
                  </Badge>
                </td>
                <td className="px-6 py-3 text-muted-foreground">
                  {automation.lastTriggeredAt
                    ? new Date(automation.lastTriggeredAt).toLocaleDateString()
                    : "Never"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trigger Picker Panel
// ---------------------------------------------------------------------------

function TriggerPickerPanel({
  onSelect,
  businessSlug,
}: {
  onSelect: (triggerId: TriggerType) => void;
  businessSlug: string;
}) {
  const [search, setSearch] = useState("");
  const filtered = triggers.filter((t) =>
    t.label.toLowerCase().includes(search.toLowerCase()),
  );
  const groups = [...new Set(filtered.map((t) => t.group))];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-4">
        <h3 className="text-sm font-medium">Select trigger</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pick an event to start this workflow
        </p>
      </div>
      <div className="px-4 pt-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search triggers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {groups.map((group) => (
          <div key={group} className="mb-4">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              {group}
            </p>
            <div className="flex flex-col gap-1">
              {filtered
                .filter((t) => t.group === group)
                .map((trigger) => (
                  <button
                    key={trigger.id}
                    type="button"
                    onClick={() => onSelect(trigger.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
                  >
                    <Zap className="size-4 text-primary" />
                    {trigger.label}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-4">
        <Button asChild variant="ghost" size="sm" className="w-full justify-start gap-2">
          <Link href={`/${businessSlug}/automations/presets`}>
            <LayoutTemplate className="size-4" />
            Start with a template
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Node Config Panel
// ---------------------------------------------------------------------------

function NodeConfigPanel({
  node,
  onAddNext,
  onDelete,
  onUpdateConfig,
  onChangeTrigger,
}: {
  node: WorkflowNode | null;
  onAddNext: () => void;
  onDelete: (nodeId: string) => void;
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
  onChangeTrigger: (triggerId: TriggerType) => void;
}) {
  if (!node) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          {node.type === "trigger" && <Zap className="size-4 text-primary" />}
          {node.type === "action" && <Play className="size-4 text-green-600" />}
          {node.type === "condition" && <Filter className="size-4 text-amber-600" />}
          {node.type === "delay" && <Clock className="size-4 text-blue-600" />}
          <div>
            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
              {node.type}
            </p>
            <h3 className="text-sm font-medium">{node.label}</h3>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {node.type === "trigger" && (
          <TriggerConfigFields
            node={node}
            onChangeTrigger={onChangeTrigger}
          />
        )}
        {node.type === "action" && (
          <ActionConfigFields
            node={node}
            onUpdateConfig={onUpdateConfig}
          />
        )}
        {node.type === "condition" && (
          <ConditionConfigFields
            node={node}
            onUpdateConfig={onUpdateConfig}
          />
        )}
        {node.type === "delay" && (
          <DelayConfigFields
            node={node}
            onUpdateConfig={onUpdateConfig}
          />
        )}
      </div>

      <div className="border-t border-border p-4 space-y-3">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Next step</p>
          <button
            type="button"
            onClick={onAddNext}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            <Plus className="size-3.5" />
            Select block
          </button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          onClick={() => onDelete(node.id)}
        >
          <Trash2 className="size-3.5" />
          Delete node
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trigger Config Fields
// ---------------------------------------------------------------------------

function TriggerConfigFields({
  node,
  onChangeTrigger,
}: {
  node: WorkflowNode;
  onChangeTrigger: (triggerId: TriggerType) => void;
}) {
  const currentTrigger = (node.config?.triggerType as string) ?? "";
  const triggerOptions = triggers.map((t) => ({ value: t.id, label: t.label }));

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="trigger-type">Trigger event</FieldLabel>
        <FieldContent>
          <Combobox
            id="trigger-type"
            placeholder="Select trigger..."
            searchable
            searchPlaceholder="Search triggers..."
            value={currentTrigger}
            onValueChange={(val) => onChangeTrigger(val as TriggerType)}
            options={triggerOptions}
          />
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}

// ---------------------------------------------------------------------------
// Action Config Fields
// ---------------------------------------------------------------------------

function ActionConfigFields({
  node,
  onUpdateConfig,
}: {
  node: WorkflowNode;
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
}) {
  const actionType = (node.config?.actionType as string) ?? "";
  const actionOptions = actionBlocks.map((a) => ({ value: a.id, label: a.label }));

  function update(field: string, value: unknown) {
    onUpdateConfig(node.id, { [field]: value });
  }

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="action-type">Action type</FieldLabel>
        <FieldContent>
          <Combobox
            id="action-type"
            placeholder="Select action..."
            searchable
            searchPlaceholder="Search actions..."
            value={actionType}
            onValueChange={(val) => {
              onUpdateConfig(node.id, { actionType: val });
            }}
            options={actionOptions}
          />
        </FieldContent>
      </Field>

      {actionType === "create_follow_up" && (
        <>
          <Field>
            <FieldLabel htmlFor="follow-up-title">Title</FieldLabel>
            <FieldContent>
              <Input
                id="follow-up-title"
                placeholder="Follow-up title"
                defaultValue={(node.config?.title as string) ?? ""}
                onBlur={(e) => update("title", e.target.value)}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="follow-up-reason">Reason</FieldLabel>
            <FieldContent>
              <Input
                id="follow-up-reason"
                placeholder="Reason for follow-up"
                defaultValue={(node.config?.reason as string) ?? ""}
                onBlur={(e) => update("reason", e.target.value)}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="follow-up-channel">Channel</FieldLabel>
            <FieldContent>
              <Combobox
                id="follow-up-channel"
                placeholder="Select channel..."
                value={(node.config?.channel as string) ?? "email"}
                onValueChange={(val) => update("channel", val)}
                options={[
                  { value: "email", label: "Email" },
                  { value: "phone", label: "Phone" },
                  { value: "sms", label: "SMS" },
                  { value: "other", label: "Other" },
                ]}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="follow-up-due">Due offset (days)</FieldLabel>
            <FieldContent>
              <Input
                id="follow-up-due"
                type="number"
                min={1}
                defaultValue={(node.config?.dueDateOffsetDays as number) ?? 3}
                onBlur={(e) => update("dueDateOffsetDays", Number(e.target.value))}
              />
            </FieldContent>
          </Field>
        </>
      )}

      {actionType === "send_email" && (
        <>
          <Field>
            <FieldLabel htmlFor="email-subject">Subject</FieldLabel>
            <FieldContent>
              <Input
                id="email-subject"
                placeholder="Email subject"
                defaultValue={(node.config?.subject as string) ?? ""}
                onBlur={(e) => update("subject", e.target.value)}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="email-body">Body</FieldLabel>
            <FieldContent>
              <Textarea
                id="email-body"
                placeholder="Email body..."
                rows={4}
                defaultValue={(node.config?.body as string) ?? ""}
                onBlur={(e) => update("body", e.target.value)}
              />
            </FieldContent>
          </Field>
        </>
      )}

      {actionType === "send_notification" && (
        <>
          <Field>
            <FieldLabel htmlFor="notif-title">Title</FieldLabel>
            <FieldContent>
              <Input
                id="notif-title"
                placeholder="Notification title"
                defaultValue={(node.config?.title as string) ?? ""}
                onBlur={(e) => update("title", e.target.value)}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="notif-body">Body</FieldLabel>
            <FieldContent>
              <Textarea
                id="notif-body"
                placeholder="Notification body..."
                rows={3}
                defaultValue={(node.config?.body as string) ?? ""}
                onBlur={(e) => update("body", e.target.value)}
              />
            </FieldContent>
          </Field>
        </>
      )}

      {actionType === "update_inquiry_status" && (
        <Field>
          <FieldLabel htmlFor="inquiry-status">Status</FieldLabel>
          <FieldContent>
            <Input
              id="inquiry-status"
              placeholder="Target status"
              defaultValue={(node.config?.status as string) ?? ""}
              onBlur={(e) => update("status", e.target.value)}
            />
          </FieldContent>
        </Field>
      )}

      {actionType === "update_quote_status" && (
        <Field>
          <FieldLabel htmlFor="quote-status">Status</FieldLabel>
          <FieldContent>
            <Input
              id="quote-status"
              placeholder="Target status"
              defaultValue={(node.config?.status as string) ?? ""}
              onBlur={(e) => update("status", e.target.value)}
            />
          </FieldContent>
        </Field>
      )}

      {actionType === "archive_inquiry" && (
        <Field>
          <FieldLabel htmlFor="archive-reason">Reason</FieldLabel>
          <FieldContent>
            <Input
              id="archive-reason"
              placeholder="Archive reason (optional)"
              defaultValue={(node.config?.reason as string) ?? ""}
              onBlur={(e) => update("reason", e.target.value)}
            />
          </FieldContent>
        </Field>
      )}

      {actionType === "create_job_from_quote" && (
        <Field>
          <FieldLabel htmlFor="job-title">Job title (optional)</FieldLabel>
          <FieldContent>
            <Input
              id="job-title"
              placeholder="Leave empty for default"
              defaultValue={(node.config?.title as string) ?? ""}
              onBlur={(e) => update("title", e.target.value)}
            />
          </FieldContent>
        </Field>
      )}

      {actionType === "generate_invoice" && (
        <Field>
          <FieldLabel htmlFor="invoice-due">Due offset (days)</FieldLabel>
          <FieldContent>
            <Input
              id="invoice-due"
              type="number"
              min={1}
              defaultValue={(node.config?.dueOffsetDays as number) ?? 14}
              onBlur={(e) => update("dueOffsetDays", Number(e.target.value))}
            />
          </FieldContent>
        </Field>
      )}

      {actionType === "generate_draft_quote" && (
        <Field orientation="horizontal">
          <FieldLabel htmlFor="ai-toggle">Use AI</FieldLabel>
          <FieldContent>
            <Switch
              id="ai-toggle"
              checked={(node.config?.useAi as boolean) ?? true}
              onCheckedChange={(checked) => update("useAi", checked)}
            />
          </FieldContent>
        </Field>
      )}
    </FieldGroup>
  );
}

// ---------------------------------------------------------------------------
// Condition Config Fields
// ---------------------------------------------------------------------------

function ConditionConfigFields({
  node,
  onUpdateConfig,
}: {
  node: WorkflowNode;
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
}) {
  const operatorOptions = [
    { value: "eq", label: "Equals" },
    { value: "neq", label: "Not equals" },
    { value: "gt", label: "Greater than" },
    { value: "gte", label: "Greater than or equal" },
    { value: "lt", label: "Less than" },
    { value: "lte", label: "Less than or equal" },
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Does not contain" },
  ];

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="cond-field">Field</FieldLabel>
        <FieldContent>
          <Input
            id="cond-field"
            placeholder="e.g. inquiry.source"
            defaultValue={(node.config?.field as string) ?? ""}
            onBlur={(e) => onUpdateConfig(node.id, { field: e.target.value })}
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor="cond-operator">Operator</FieldLabel>
        <FieldContent>
          <Combobox
            id="cond-operator"
            placeholder="Select operator..."
            value={(node.config?.operator as string) ?? "eq"}
            onValueChange={(val) => onUpdateConfig(node.id, { operator: val })}
            options={operatorOptions}
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor="cond-value">Value</FieldLabel>
        <FieldContent>
          <Input
            id="cond-value"
            placeholder="Comparison value"
            defaultValue={(node.config?.value as string) ?? ""}
            onBlur={(e) => onUpdateConfig(node.id, { value: e.target.value })}
          />
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}

// ---------------------------------------------------------------------------
// Delay Config Fields
// ---------------------------------------------------------------------------

function DelayConfigFields({
  node,
  onUpdateConfig,
}: {
  node: WorkflowNode;
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
}) {
  const unitOptions = [
    { value: "minutes", label: "Minutes" },
    { value: "hours", label: "Hours" },
    { value: "days", label: "Days" },
  ];

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="delay-value">Delay value</FieldLabel>
        <FieldContent>
          <Input
            id="delay-value"
            type="number"
            min={1}
            defaultValue={(node.config?.value as number) ?? 1}
            onBlur={(e) => onUpdateConfig(node.id, { value: Number(e.target.value) })}
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor="delay-unit">Unit</FieldLabel>
        <FieldContent>
          <Combobox
            id="delay-unit"
            placeholder="Select unit..."
            value={(node.config?.unit as string) ?? "hours"}
            onValueChange={(val) => onUpdateConfig(node.id, { unit: val })}
            options={unitOptions}
          />
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}

// ---------------------------------------------------------------------------
// Next Step Picker Panel
// ---------------------------------------------------------------------------

function NextStepPickerPanel({
  onSelect,
}: {
  onSelect: (blockType: string, label: string, nodeType: WorkflowNode["type"]) => void;
}) {
  const [search, setSearch] = useState("");

  const allBlocks = [
    ...actionBlocks.map((b) => ({ ...b, nodeType: "action" as const })),
    ...conditionBlocks.map((b) => ({ ...b, nodeType: "condition" as const })),
    ...delayBlocks.map((b) => ({ ...b, nodeType: "delay" as const })),
  ];

  const filtered = allBlocks.filter((b) =>
    b.label.toLowerCase().includes(search.toLowerCase()),
  );
  const groups = [...new Set(filtered.map((b) => b.group))];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-4">
        <h3 className="text-sm font-medium">Next step</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Add the next block to your workflow
        </p>
      </div>
      <div className="px-4 pt-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search blocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {groups.map((group) => (
          <div key={group} className="mb-4">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              {group}
            </p>
            <div className="flex flex-col gap-1">
              {filtered
                .filter((b) => b.group === group)
                .map((block) => {
                  const Icon = block.icon;
                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => onSelect(block.id, block.label, block.nodeType)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      {block.label}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
