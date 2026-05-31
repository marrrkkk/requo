import type { BusinessPlan } from "@/lib/plans/plans";
import type { AutomationListItem, AutomationStats } from "../../queries";

export type ViewMode = "list" | "builder";

export type BuilderTab = "editor" | "runs";

export type SidebarPanel =
  | { type: "trigger-picker" }
  | { type: "node-config"; nodeId: string }
  | { type: "next-step-picker"; afterNodeId: string };

export type WorkflowNode = {
  id: string;
  type: "trigger" | "condition" | "delay" | "action";
  label: string;
  config: Record<string, unknown>;
  position?: { x: number; y: number };
};

export type WorkflowEdge = {
  source: string;
  target: string;
};

export type AutomationsWorkspaceProps = {
  automations: AutomationListItem[];
  plan: BusinessPlan;
  limit: number;
  hasBuilderAccess: boolean;
  businessSlug: string;
  selectedAutomationId?: string;
  businessType?: string;
  stats?: AutomationStats;
};
