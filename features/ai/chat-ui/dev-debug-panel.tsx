"use client";

import { useState } from "react";
import type { UIMessage } from "ai";
import { ChevronDown, Bug } from "lucide-react";
import { cn } from "@/lib/utils";

const IS_DEV = process.env.NODE_ENV === "development";

type MessageDebugInfo = {
  role: string;
  partsBreakdown: { type: string; count: number }[];
  toolCalls: { name: string; state: string }[];
  textLength: number;
  estimatedTokens: number;
};

function extractMessageDebug(message: UIMessage): MessageDebugInfo {
  const partCounts = new Map<string, number>();
  const toolCalls: { name: string; state: string }[] = [];
  let textLength = 0;

  if (message.parts) {
    for (const part of message.parts) {
      const type = part.type;
      partCounts.set(type, (partCounts.get(type) ?? 0) + 1);

      if (type === "text" && "text" in part) {
        textLength += (part as { text: string }).text.length;
      } else if ("toolCallId" in part && "state" in part) {
        const toolName = type.startsWith("tool-")
          ? type.slice(5)
          : ("toolName" in part ? (part as { toolName: string }).toolName : type);
        toolCalls.push({
          name: toolName,
          state: (part as { state: string }).state,
        });
      }
    }
  }

  return {
    role: message.role,
    partsBreakdown: [...partCounts.entries()].map(([type, count]) => ({ type, count })),
    toolCalls,
    textLength,
    estimatedTokens: Math.ceil(textLength / 4),
  };
}

export function DevMessageDebug({ message }: { message: UIMessage }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!IS_DEV) return null;
  if (message.role === "user") return null;

  const debug = extractMessageDebug(message);

  return (
    <div className="mt-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-[0.6rem] text-muted-foreground/40 transition-colors hover:text-muted-foreground/70"
      >
        <Bug className="size-2.5" />
        <span>
          {debug.estimatedTokens}tok · {debug.toolCalls.length} tools
        </span>
        <ChevronDown
          className={cn(
            "size-2.5 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="mt-1 rounded border border-border/30 bg-muted/20 px-2 py-1.5 font-mono text-[0.6rem] text-muted-foreground/70">
          <div className="flex gap-3">
            <span>Chars: {debug.textLength}</span>
            <span>Tokens: ~{debug.estimatedTokens}</span>
          </div>

          {debug.toolCalls.length > 0 && (
            <div className="mt-1 border-t border-border/20 pt-1">
              {debug.toolCalls.map((tc, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className={cn(
                    "size-1 rounded-full",
                    tc.state === "output-available" ? "bg-green-500" : "bg-yellow-500",
                  )} />
                  <span>{tc.name}</span>
                  <span className="text-muted-foreground/40">{tc.state}</span>
                </div>
              ))}
            </div>
          )}

          {debug.partsBreakdown.length > 0 && (
            <div className="mt-1 border-t border-border/20 pt-1">
              {debug.partsBreakdown.map((p) => (
                <span key={p.type} className="mr-2">
                  {p.type}:{p.count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Keep for backward compat but now unused from the bottom panel
export function DevDebugPanel({ messages }: { messages: UIMessage[] }) {
  if (!IS_DEV) return null;
  return null;
}
