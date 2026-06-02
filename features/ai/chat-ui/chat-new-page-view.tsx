"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
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
    const message = consumePendingMessage();
    if (!message) return;

    setIsRedirecting(true); // eslint-disable-line react-hooks/set-state-in-effect -- intentional loading state on mount when arriving with pending message

    startTransition(async () => {
      try {
        const result = await startNewChat({
          userId,
          businessId,
          businessSlug,
          message,
        });

        if (result.conversationId) {
          // Re-set the pending message so the conversation page can trigger the AI response
          setPendingMessage(message);
          router.replace(
            getBusinessChatConversationPath(businessSlug, result.conversationId),
          );
        } else {
          setIsRedirecting(false);
        }
      } catch {
        setIsRedirecting(false);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submitMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isPending) return;

      setInputValue("");

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

  // Show loading state only when actively redirecting from a dashboard pending message
  if (isRedirecting) {
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

      {/* Centered layout — logo → input → suggestions */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        {/* Requo logo */}
        <div className="mb-8">
          <RequoIcon className="size-10 text-muted-foreground/50" />
        </div>

        {/* Chat input */}
        <div className="w-full max-w-2xl">
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
              className="text-sm"
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

        {/* Suggestion chips — below the input */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => submitMessage(action.prompt)}
              disabled={isPending}
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
