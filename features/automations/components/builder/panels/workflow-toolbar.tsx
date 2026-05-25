"use client";

import {
  Zap,
  GitBranch,
  Clock,
  Play,
  Save,
  CheckCircle,
  Undo2,
  Redo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export type WorkflowToolbarProps = {
  onAddNode: (type: "trigger" | "condition" | "delay" | "action") => void;
  onSave: () => void;
  onValidate: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

export function WorkflowToolbar({
  onAddNode,
  onSave,
  onValidate,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: WorkflowToolbarProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-surface-card p-1.5 shadow-sm">
      <div className="flex items-center gap-1 border-r border-border pr-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onAddNode("trigger")}
          title="Add trigger"
        >
          <Zap className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onAddNode("condition")}
          title="Add condition"
        >
          <GitBranch className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onAddNode("delay")}
          title="Add delay"
        >
          <Clock className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onAddNode("action")}
          title="Add action"
        >
          <Play className="size-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 border-r border-border pr-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
        >
          <Redo2 className="size-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onValidate}
          title="Validate workflow"
        >
          <CheckCircle className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onSave}
          title="Save workflow"
        >
          <Save className="size-4" />
        </Button>
      </div>
    </div>
  );
}
