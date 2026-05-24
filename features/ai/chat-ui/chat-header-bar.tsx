"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, History, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  fetchDashboardConversations,
  deleteConversation,
} from "@/features/ai/components/ai-chat-helpers";
import {
  getBusinessChatNewPath,
  getBusinessChatConversationPath,
} from "@/features/businesses/routes";
import type { AiConversationSummary } from "@/features/ai/types";

type ChatHeaderBarProps = {
  businessSlug: string;
  conversationId?: string;
};

export function ChatHeaderBar({
  businessSlug,
  conversationId,
}: ChatHeaderBarProps) {
  return (
    <div className="flex shrink-0 items-center justify-between px-4 py-2 sm:px-6">
      <NewChatButton businessSlug={businessSlug} />
      <div className="flex items-center gap-1">
        <HistoryButton businessSlug={businessSlug} currentId={conversationId} />
        {conversationId && (
          <MoreMenu
            conversationId={conversationId}
            businessSlug={businessSlug}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Chat Button
// ---------------------------------------------------------------------------

function NewChatButton({ businessSlug }: { businessSlug: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => router.push(getBusinessChatNewPath(businessSlug))}
      aria-label="New chat"
    >
      <Plus className="size-4" />
    </Button>
  );
}

// ---------------------------------------------------------------------------
// History Button with Popover
// ---------------------------------------------------------------------------

function HistoryButton({
  businessSlug,
  currentId,
}: {
  businessSlug: string;
  currentId?: string;
}) {
  const router = useRouter();
  const [conversations, setConversations] = useState<AiConversationSummary[]>(
    [],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    // Loading state is set before the async call to show a spinner immediately
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading indicator for async fetch
    setIsLoading(true);
    fetchDashboardConversations({
      businessSlug,
      entityId: "global",
    })
      .then((res) => {
        if (!cancelled) setConversations(res.conversations);
      })
      .catch(() => {
        if (!cancelled) setConversations([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOpen, businessSlug]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Chat history">
          <History className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 max-h-[320px] overflow-y-auto p-1"
      >
        {isLoading ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            Loading...
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            No conversations yet
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => {
                setIsOpen(false);
                router.push(
                  getBusinessChatConversationPath(businessSlug, conv.id),
                );
              }}
              className={`flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                conv.id === currentId ? "bg-muted" : ""
              }`}
            >
              <span className="truncate font-medium text-foreground">
                {conv.title || "New conversation"}
              </span>
              {conv.lastMessagePreview && (
                <span className="truncate text-xs text-muted-foreground">
                  {conv.lastMessagePreview}
                </span>
              )}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// More Menu (3 dots)
// ---------------------------------------------------------------------------

function MoreMenu({
  conversationId,
  businessSlug,
}: {
  conversationId: string;
  businessSlug: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteConversation(conversationId);
      router.push(getBusinessChatNewPath(businessSlug));
    } catch {
      setIsDeleting(false);
    }
  }, [conversationId, businessSlug, isDeleting, router]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="More options">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="size-3.5" />
          {isDeleting ? "Deleting..." : "Delete chat"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
