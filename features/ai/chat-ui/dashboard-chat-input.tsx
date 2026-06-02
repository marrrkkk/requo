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

      {/* Input — matches the main chat page style */}
      <div
        className={cn(
          "w-full transition-[max-width,box-shadow] duration-200 ease-out",
          isExpanded ? "max-w-2xl" : "max-w-xl",
        )}
        onClick={() => setIsExpanded(true)}
      >
        <PromptInput
          value={inputValue}
          onValueChange={setInputValue}
          onSubmit={handleSubmit}
          isLoading={isNavigating}
          disabled={isNavigating}
          className={cn(
            "rounded-2xl border bg-card shadow-md transition-all duration-200",
            isExpanded
              ? "border-primary/50 ring-2 ring-primary/10 shadow-xl"
              : "border-border/80 hover:shadow-lg hover:border-border",
          )}
        >
          <PromptInputTextarea
            placeholder={getPanelPlaceholder("dashboard")}
            className="min-h-[44px] text-sm"
            onFocus={() => setIsExpanded(true)}
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
      </div>
    </div>
  );
}
