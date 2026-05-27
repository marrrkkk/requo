"use client";

import { useCallback, useState, useTransition } from "react";
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
import { startNewChat } from "@/features/ai/actions/start-new-chat";
import { getBusinessChatConversationPath } from "@/features/businesses/routes";

export type DashboardChatInputProps = {
  businessSlug: string;
  userId: string;
  businessId: string;
};

export function DashboardChatInput({
  businessSlug,
  userId,
  businessId,
}: DashboardChatInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { setPendingMessage } = usePendingMessage();

  const handleSubmit = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isPending) return;

    startTransition(async () => {
      // Store message in context for the chat page to consume
      setPendingMessage(text);

      const result = await startNewChat({
        userId,
        businessId,
        businessSlug,
        message: text,
      });

      if (result.conversationId) {
        router.push(
          getBusinessChatConversationPath(businessSlug, result.conversationId),
        );
      }
    });
  }, [inputValue, isPending, setPendingMessage, userId, businessId, businessSlug, router]);

  return (
    <PromptInput
      value={inputValue}
      onValueChange={setInputValue}
      onSubmit={handleSubmit}
      isLoading={isPending}
      disabled={isPending}
      className="rounded-xl border border-border/80 bg-card shadow-md focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200"
    >
      <PromptInputTextarea
        placeholder="Ask anything..."
        className="min-h-[44px] text-sm"
      />
      <PromptInputActions className="justify-end pt-1">
        <PromptInputAction tooltip="Send message">
          <Button
            variant="default"
            size="icon-xs"
            className="rounded-full"
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isPending}
            type="button"
          >
            <ArrowUp className="size-3.5" />
          </Button>
        </PromptInputAction>
      </PromptInputActions>
    </PromptInput>
  );
}
