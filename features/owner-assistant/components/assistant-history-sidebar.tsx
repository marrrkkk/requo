"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronsLeft,
  ChevronsRight,
  History,
  MessageSquarePlus,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  deleteAssistantSessionAction,
  listAssistantSessionsAction,
  renameAssistantSessionAction,
} from "@/features/owner-assistant/actions";

type HistoryItem = {
  id: string;
  title: string | null;
  lastMessageAt: string;
  createdAt: string;
};

const PAGE_SIZE = 20;

export function AssistantHistorySidebar({
  businessSlug,
  activeSessionId,
}: {
  businessSlug: string;
  activeSessionId?: string | null;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border/60 bg-card/30 transition-all",
          collapsed ? "w-12" : "w-72",
        )}
        aria-label="Conversation history"
      >
        <div className="flex items-center justify-between gap-1 p-2 border-b border-border/60">
          {!collapsed && (
            <span className="meta-label px-2">Conversations</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand history" : "Collapse history"}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <ChevronsRight className="size-4" />
            ) : (
              <ChevronsLeft className="size-4" />
            )}
          </Button>
        </div>
        {!collapsed && (
          <HistoryList
            businessSlug={businessSlug}
            activeSessionId={activeSessionId}
            onNavigate={() => {}}
          />
        )}
      </aside>

      {/* Mobile: history in a sheet */}
      <div className="md:hidden absolute left-3 top-3 z-10">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Open conversation history">
              <History className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0 flex flex-col">
            <SheetHeader className="p-4 pb-2 text-left">
              <SheetTitle>Conversations</SheetTitle>
              <SheetDescription className="sr-only">
                Your past assistant conversations. Select one to resume it.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 min-h-0">
              <HistoryList
                businessSlug={businessSlug}
                activeSessionId={activeSessionId}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

function HistoryList({
  businessSlug,
  activeSessionId,
  onNavigate,
}: {
  businessSlug: string;
  activeSessionId?: string | null;
  onNavigate: () => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyResult = useCallback(
    (
      result: Awaited<ReturnType<typeof listAssistantSessionsAction>>,
      append: boolean,
    ) => {
      if ("error" in result) {
        setError(result.error);
      } else {
        setItems((prev) =>
          append ? [...prev, ...result.sessions] : result.sessions,
        );
        setTotal(result.total);
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [],
  );

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    const result = await listAssistantSessionsAction({
      businessSlug,
      limit: PAGE_SIZE,
      offset: items.length,
    });
    applyResult(result, true);
  }, [businessSlug, items.length, applyResult]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const result = await listAssistantSessionsAction({
        businessSlug,
        limit: PAGE_SIZE,
        offset: 0,
      });
      if (!cancelled) {
        applyResult(result, false);
      }
    };
    void refresh();
    window.addEventListener("assistant:history-changed", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("assistant:history-changed", refresh);
    };
  }, [businessSlug, activeSessionId, applyResult]);

  const hasMore = items.length < total;

  const handleRename = async (id: string) => {
    const value = editValue.trim();
    if (!value) {
      setEditingId(null);
      return;
    }
    const result = await renameAssistantSessionAction({
      businessSlug,
      sessionId: id,
      title: value,
    });
    if (!("error" in result)) {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, title: value } : item)),
      );
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteAssistantSessionAction({
      businessSlug,
      sessionId: id,
    });
    setDeletingId(null);
    if (!("error" in result)) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      if (id === activeSessionId) {
        router.push(`/${businessSlug}/assistant`);
      }
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => {
            onNavigate();
            router.push(`/${businessSlug}/assistant`);
          }}
        >
          <MessageSquarePlus className="size-4" />
          New chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0" role="list" aria-label="Past conversations">
        {loading ? (
          <div className="flex flex-col gap-2 p-1" aria-label="Loading conversations">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="p-2 text-sm text-destructive">{error}</p>
        ) : items.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">
            No conversations yet. Start a new chat above.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => {
              const isActive = item.id === activeSessionId;
              const isEditing = editingId === item.id;
              const isConfirmingDelete = deletingId === item.id;
              return (
                <li key={item.id} role="listitem">
                  {isEditing ? (
                    <form
                      className="flex items-center gap-1 p-1"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleRename(item.id);
                      }}
                    >
                      <Input
                        value={editValue}
                        onChange={(event) => setEditValue(event.target.value)}
                        className="h-8 text-sm"
                        maxLength={80}
                        autoFocus
                        aria-label="Conversation title"
                      />
                      <Button type="submit" size="sm" className="h-8">
                        Save
                      </Button>
                    </form>
                  ) : (
                    <div
                      className={cn(
                        "group flex items-center gap-1 rounded-lg px-2 py-2 hover:bg-muted/60",
                        isActive && "bg-muted",
                      )}
                    >
                      <Link
                        href={`/${businessSlug}/assistant/chat/${item.id}`}
                        onClick={onNavigate}
                        className="min-w-0 flex-1"
                        aria-current={isActive ? "page" : undefined}
                      >
                        <span className="block truncate text-sm font-medium">
                          {item.title ?? "New conversation"}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {new Date(item.lastMessageAt).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" },
                          )}
                        </span>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        onClick={() => {
                          setEditingId(item.id);
                          setEditValue(item.title ?? "");
                        }}
                        aria-label={`Rename conversation ${item.title ?? ""}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      {isConfirmingDelete ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 shrink-0"
                          onClick={() => void handleDelete(item.id)}
                        >
                          Confirm
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                          onClick={() => setDeletingId(item.id)}
                          onBlur={() => setDeletingId(null)}
                          aria-label={`Delete conversation ${item.title ?? ""}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {hasMore && !loading && (
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? "Loading…" : `Show more (${total - items.length} remaining)`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
