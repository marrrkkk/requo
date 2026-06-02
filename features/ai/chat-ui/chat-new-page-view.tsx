"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequoIcon } from "@/components/shared/requo-icon";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/prompt-kit/prompt-input";
import { usePendingMessage } from "./pending-message-context";
import { ChatHeaderBar } from "./chat-header-bar";
import { startNewChat } from "@/features/ai/actions/start-new-chat";
import {
  aiQuickActions,
  getPanelPlaceholder,
} from "@/features/ai/components/ai-chat-helpers";
import { getBusinessChatConversationPath } from "@/features/businesses/routes";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ChatNewPageViewProps = {
  businessSlug: string;
  userId: string;
  businessId: string;
  userName: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatNewPageView({
  businessSlug,
  userId,
  businessId,
}: ChatNewPageViewProps) {
  const [inputValue, setInputValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const { setPendingMessage } = usePendingMessage();

  const submitMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isCreating) return;
      const trimmed = text.trim();
      setIsCreating(true);

      const result = await startNewChat({
        userId,
        businessId,
        businessSlug,
        message: trimmed,
      });

      if (result.conversationId) {
        setPendingMessage(trimmed);
        router.push(
          getBusinessChatConversationPath(businessSlug, result.conversationId),
        );
        // Don't reset isCreating — let it stay until navigation completes
      } else {
        setIsCreating(false);
      }
    },
    [isCreating, userId, businessId, businessSlug, setPendingMessage, router],
  );

  const handleSubmit = useCallback(() => {
    submitMessage(inputValue);
  }, [inputValue, submitMessage]);

  const quickActions = aiQuickActions.dashboard;

  return (
    <div className="flex h-full flex-col overflow-hidden" data-chat-page>
      <ChatHeaderBar businessSlug={businessSlug} />

      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="mb-8">
          <RequoIcon className="size-10 text-muted-foreground/50" />
        </div>

        <div className="w-full max-w-2xl">
          <PromptInput
            value={inputValue}
            onValueChange={setInputValue}
            onSubmit={handleSubmit}
            isLoading={isCreating}
            className="rounded-2xl border border-border/80 bg-card shadow-md focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200"
          >
            <PromptInputTextarea
              placeholder={getPanelPlaceholder("dashboard")}
              className="text-sm"
            />
            <PromptInputActions className="justify-end pt-1">
              <PromptInputAction tooltip="Send message">
                <Button
                  variant="default"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={handleSubmit}
                  disabled={!inputValue.trim() || isCreating}
                  type="button"
                >
                  <ArrowUp className="size-4" />
                </Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => submitMessage(action.prompt)}
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/50 hover:text-foreground disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
