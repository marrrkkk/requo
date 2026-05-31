"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

import type { WorkflowNode } from "./types";
import { actionBlocks, conditionBlocks, delayBlocks } from "./definitions";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NextStepPickerPanel({
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
