"use client";

import { useState } from "react";
import { Search, LayoutTemplate } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TriggerType } from "../../types";

import { triggers } from "./definitions";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TriggerPickerPanel({
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
                .map((trigger) => {
                  const Icon = trigger.icon;
                  return (
                    <button
                      key={trigger.id}
                      type="button"
                      onClick={() => onSelect(trigger.id)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
                    >
                      <Icon className="size-4 text-primary" />
                      {trigger.label}
                    </button>
                  );
                })}
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
