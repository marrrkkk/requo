"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/prompt-kit/prompt-input";
import { usePendingMessage } from "@/features/ai/chat-ui/pending-message-context";
import { getBusinessChatNewPath } from "@/features/businesses/routes";
import { getPanelPlaceholder } from "@/features/ai/components/ai-chat-helpers";
import { cn } from "@/lib/utils";

export type SuggestionChip = {
  label: string;
  prompt: string;
};

export type DashboardChatInputProps = {
  businessSlug: string;
  userId: string;
  businessId: string;
  suggestions?: SuggestionChip[];
};

export function DashboardChatInput({
  businessSlug,
  suggestions,
}: DashboardChatInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();
  const { setPendingMessage } = usePendingMessage();
  const containerRef = useRef<HTMLDivElement>(null);

  // Collapse when clicking outside
  useEffect(() => {
    if (!isExpanded) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        if (!inputValue.trim()) {
          setIsExpanded(false);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded, inputValue]);

  const submitMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isNavigating) return;

      // Set the pending message and navigate to chat/new immediately.
      // The chat new page will pick it up, create the conversation, and redirect.
      setIsNavigating(true);
      setPendingMessage(text.trim());
      setInputValue("");
      setIsExpanded(false);
      router.push(getBusinessChatNewPath(businessSlug));
    },
    [isNavigating, setPendingMessage, businessSlug, router],
  );

  const handleSubmit = useCallback(() => {
    submitMessage(inputValue);
  }, [inputValue, submitMessage]);

  const handleChipClick = useCallback(
    (prompt: string) => {
      submitMessage(prompt);
    },
    [submitMessage],
  );

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-0">
      {/* Suggestion chips — above the input, appear on expand */}
      <div
        className={cn(
          "flex flex-wrap justify-center gap-1.5 overflow-hidden transition-[max-height,opacity,transform] duration-200 ease-out",
          isExpanded && suggestions && suggestions.length > 0 && !inputValue.trim()
            ? "max-h-16 opacity-100 translate-y-0 mb-2.5"
            : "max-h-0 opacity-0 translate-y-2 pointer-events-none mb-0",
        )}
      >
        {suggestions?.map((chip) => (
          <button
            key={chip.label}
            type="button"
            disabled={isNavigating}
            onClick={() => handleChipClick(chip.prompt)}
            className="rounded-full border border-border/60 bg-card/90 backdrop-blur-sm px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/50 hover:text-foreground disabled:opacity-50"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div
        className={cn(
          "w-full transition-[max-width] duration-300 ease-in-out",
          isExpanded ? "max-w-2xl" : "max-w-xl",
        )}
      >
        {isExpanded ? (
          /* Expanded: full original PromptInput, same as main chat page */
          <PromptInput
            value={inputValue}
            onValueChange={setInputValue}
            onSubmit={handleSubmit}
            isLoading={isNavigating}
            disabled={isNavigating}
            className="rounded-2xl border border-primary/50 bg-card shadow-xl ring-2 ring-primary/10"
          >
            <PromptInputTextarea
              placeholder={getPanelPlaceholder("dashboard")}
              className="text-sm"
              autoFocus
            />
            <PromptInputActions className="justify-end pt-1">
              <PromptInputAction tooltip="Send message">
                <Button
                  variant="default"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={handleSubmit}
                  disabled={!inputValue.trim() || isNavigating}
                  type="button"
                >
                  <ArrowUp className="size-4" />
                </Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        ) : (
          /* Collapsed: slim single-row bar */
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="flex w-full cursor-text items-center gap-2 rounded-2xl border border-border/80 bg-card p-2 shadow-md transition-all duration-300 ease-in-out hover:border-border hover:shadow-lg"
          >
            <span className="flex-1 truncate pl-1 text-left text-sm text-muted-foreground/70">
              {getPanelPlaceholder("dashboard")}
            </span>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ArrowUp className="size-4" />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
