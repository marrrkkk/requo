"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/prompt-kit/prompt-input";
import { Spinner } from "@/components/ui/spinner";
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
  const [isPending, startTransition] = useTransition();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const { pendingMessage, consumePendingMessage, setPendingMessage } = usePendingMessage();

  // If we arrived here from the dashboard with a pending message,
  // show a loading state while the chat is being created.
  useEffect(() => {
    if (!pendingMessage) return;

    const message = consumePendingMessage();
    if (!message) return;

    setIsRedirecting(true); // eslint-disable-line react-hooks/set-state-in-effect -- intentional loading state on mount when arriving with pending message

    startTransition(async () => {
      // Re-set the pending message so the conversation page can trigger the AI response
      setPendingMessage(message);

      const result = await startNewChat({
        userId,
        businessId,
        businessSlug,
        message,
      });

      if (result.conversationId) {
        router.replace(
          getBusinessChatConversationPath(businessSlug, result.conversationId),
        );
      } else {
        setIsRedirecting(false);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submitMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isPending) return;

      startTransition(async () => {
        const result = await startNewChat({
          userId,
          businessId,
          businessSlug,
          message: text.trim(),
        });

        if (result.conversationId) {
          router.push(
            getBusinessChatConversationPath(businessSlug, result.conversationId),
          );
        }
      });
    },
    [isPending, userId, businessId, businessSlug, router],
  );

  const handleSubmit = useCallback(() => {
    submitMessage(inputValue);
  }, [inputValue, submitMessage]);

  const quickActions = aiQuickActions.dashboard;

  // Show loading state when redirecting from dashboard
  if (isRedirecting || pendingMessage) {
    return (
      <div className="flex h-full flex-col overflow-hidden" data-chat-page>
        <ChatHeaderBar businessSlug={businessSlug} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <Spinner className="size-6 text-primary" />
          <p className="text-sm text-muted-foreground">Starting conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" data-chat-page>
      {/* Header with history */}
      <ChatHeaderBar businessSlug={businessSlug} />

      {/* Empty state — centered */}
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="size-6 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-base font-medium text-foreground">
            Start a new conversation
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask anything about your business, inquiries, quotes, or follow-ups.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="secondary"
              size="sm"
              onClick={() => submitMessage(action.prompt)}
              disabled={isPending}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Input — centered, prompt-kit style */}
      <div className="shrink-0 pb-6">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
          <PromptInput
            value={inputValue}
            onValueChange={setInputValue}
            onSubmit={handleSubmit}
            isLoading={isPending}
            disabled={isPending}
            className="rounded-2xl border border-border/80 bg-card shadow-md focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200"
          >
            <PromptInputTextarea
              placeholder={getPanelPlaceholder("dashboard")}
              className="min-h-[44px] text-sm"
            />
            <PromptInputActions className="justify-end pt-1">
              <PromptInputAction tooltip="Send message">
                <Button
                  variant="default"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={handleSubmit}
                  disabled={!inputValue.trim() || isPending}
                  type="button"
                >
                  <ArrowUp className="size-4" />
                </Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
