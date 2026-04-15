"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Bell,
  CheckCheck,
  CircleCheckBig,
  CircleX,
  Inbox,
  MailPlus,
  UserCheck,
  UserX,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  markBusinessNotificationsReadAction,
} from "@/features/notifications/actions";
import type {
  BusinessNotificationBellView,
  BusinessNotificationItem,
  BusinessNotificationType,
} from "@/features/notifications/types";
import {
  formatNotificationDateTime,
  formatRelativeNotificationTime,
  isNotificationUnread,
} from "@/features/notifications/utils";
import { cn } from "@/lib/utils";

type DashboardNotificationBellProps = {
  businessId: string;
  businessSlug: string;
  initialView: BusinessNotificationBellView;
  userId: string;
};

type RealtimeNotificationRow = {
  id: string;
  inquiry_id: string | null;
  quote_id: string | null;
  summary: string;
  title: string;
  type: BusinessNotificationType;
  created_at: string;
};

type RealtimeNotificationStateRow = {
  last_read_at: string | null;
};

const maxVisibleNotifications = 15;

export function DashboardNotificationBell({
  businessId,
  businessSlug,
  initialView,
  userId,
}: DashboardNotificationBellProps) {
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(
    null,
  );
  const refreshTimerRef = useRef<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [shouldConnectRealtime, setShouldConnectRealtime] = useState(false);
  const [view, setView] = useState(initialView);

  function applyReadWatermark(nextLastReadAt: string) {
    setView((currentView) => {
      const items = currentView.items.map((item) => ({
        ...item,
        unread: isNotificationUnread(item.createdAt, nextLastReadAt),
      }));

      return {
        items,
        unreadCount: items.filter((item) => item.unread).length,
        lastReadAt: nextLastReadAt,
      };
    });
  }

  function markSingleNotificationRead(itemId: string) {
    setView((currentView) => {
      let didUpdate = false;
      const items = currentView.items.map((item) => {
        if (item.id !== itemId || !item.unread) {
          return item;
        }

        didUpdate = true;
        return { ...item, unread: false };
      });

      if (!didUpdate) {
        return currentView;
      }

      return {
        ...currentView,
        items,
        unreadCount: Math.max(0, currentView.unreadCount - 1),
      };
    });
  }

  useEffect(() => {
    if (shouldConnectRealtime) {
      return;
    }

    const connectWhenIdle = () => {
      setShouldConnectRealtime(true);
    };

    if (isOpen) {
      connectWhenIdle();
      return;
    }

    if (typeof window.requestIdleCallback === "function") {
      const idleCallbackId = window.requestIdleCallback(connectWhenIdle, {
        timeout: 8_000,
      });

      return () => window.cancelIdleCallback(idleCallbackId);
    }

    const timeoutId = globalThis.setTimeout(connectWhenIdle, 4_000);

    return () => globalThis.clearTimeout(timeoutId);
  }, [isOpen, shouldConnectRealtime]);

  useEffect(() => {
    if (!shouldConnectRealtime) {
      return;
    }

    let isActive = true;
    const supabase =
      supabaseRef.current ?? createSupabaseBrowserClient();

    supabaseRef.current = supabase;
    let notificationChannel:
      | Awaited<ReturnType<typeof supabase.channel>>
      | null = null;
    let stateChannel:
      | Awaited<ReturnType<typeof supabase.channel>>
      | null = null;

    function clearRefreshTimer() {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }

    function scheduleRefresh(expiresAt: string) {
      clearRefreshTimer();

      const refreshInMs = Math.max(
        new Date(expiresAt).getTime() - Date.now() - 60_000,
        30_000,
      );

      refreshTimerRef.current = window.setTimeout(() => {
        void refreshRealtimeAuth();
      }, refreshInMs);
    }

    async function fetchRealtimeToken() {
      const response = await fetch("/api/business/notifications/realtime-token", {
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as {
        expiresAt: string;
        token: string;
      };
    }

    async function refreshRealtimeAuth() {
      const nextToken = await fetchRealtimeToken();

      if (!nextToken || !isActive) {
        return;
      }

      await supabase.realtime.setAuth(nextToken.token);
      scheduleRefresh(nextToken.expiresAt);
    }

    async function connectRealtime() {
      const nextToken = await fetchRealtimeToken();

      if (!nextToken || !isActive) {
        return;
      }

      await supabase.realtime.setAuth(nextToken.token);

      const handleRealtimeNotification = (row: RealtimeNotificationRow) => {
        setView((currentView) => {
          if (currentView.items.some((item) => item.id === row.id)) {
            return currentView;
          }

          const unread = isNotificationUnread(
            row.created_at,
            currentView.lastReadAt,
          );
          const nextItem: BusinessNotificationItem = {
            id: row.id,
            type: row.type,
            title: row.title,
            summary: row.summary,
            href: row.quote_id
              ? `/businesses/${businessSlug}/dashboard/quotes/${row.quote_id}`
              : row.inquiry_id
                ? `/businesses/${businessSlug}/dashboard/inquiries/${row.inquiry_id}`
                : `/businesses/${businessSlug}/dashboard`,
            createdAt: row.created_at,
            unread,
          };

          return {
            items: [nextItem, ...currentView.items].slice(0, maxVisibleNotifications),
            unreadCount: currentView.unreadCount + (unread ? 1 : 0),
            lastReadAt: currentView.lastReadAt,
          };
        });
      };

      const handleRealtimeState = (row: RealtimeNotificationStateRow) => {
        if (!row.last_read_at) {
          return;
        }

        applyReadWatermark(row.last_read_at);
      };

      notificationChannel = supabase
        .channel(`business-notifications:${businessId}:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            filter: `business_id=eq.${businessId}`,
            schema: "public",
            table: "business_notifications",
          },
          (payload) => {
            handleRealtimeNotification(payload.new as RealtimeNotificationRow);
          },
        )
        .subscribe();

      stateChannel = supabase
        .channel(`business-notification-states:${businessId}:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            filter: `business_id=eq.${businessId}`,
            schema: "public",
            table: "business_notification_states",
          },
          (payload) => {
            handleRealtimeState(payload.new as RealtimeNotificationStateRow);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            filter: `business_id=eq.${businessId}`,
            schema: "public",
            table: "business_notification_states",
          },
          (payload) => {
            handleRealtimeState(payload.new as RealtimeNotificationStateRow);
          },
        )
        .subscribe();

      scheduleRefresh(nextToken.expiresAt);
    }

    void connectRealtime();

    return () => {
      isActive = false;
      clearRefreshTimer();

      if (notificationChannel) {
        void supabase.removeChannel(notificationChannel);
      }

      if (stateChannel) {
        void supabase.removeChannel(stateChannel);
      }
    };
  }, [businessId, businessSlug, shouldConnectRealtime, userId]);

  function markAllRead() {
    const newestNotification = view.items[0];

    if (!newestNotification) {
      return;
    }

    applyReadWatermark(newestNotification.createdAt);

    startTransition(async () => {
      const result = await markBusinessNotificationsReadAction(
        businessSlug,
        newestNotification.createdAt,
      );

      if (!result.ok) {
        console.error(result.error);
        router.refresh();
        return;
      }

      applyReadWatermark(result.lastReadAt);
    });
  }

  function openNotification(item: BusinessNotificationItem) {
    setIsOpen(false);

    if (item.unread) {
      markSingleNotificationRead(item.id);

      startTransition(async () => {
        const result = await markBusinessNotificationsReadAction(
          businessSlug,
          item.createdAt,
        );

        if (!result.ok) {
          console.error(result.error);
          return;
        }

        applyReadWatermark(result.lastReadAt);
      });
    }

    router.push(item.href);
  }

  return (
    <Popover modal={false} onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-label={
            view.unreadCount
              ? `${view.unreadCount} unread notifications`
              : "Notifications"
          }
          className="relative"
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Bell className="size-4.5" />
          {view.unreadCount ? (
            <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 py-0.5 text-[0.65rem] font-semibold leading-none text-background shadow-sm">
              {view.unreadCount > 99 ? "99+" : view.unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="overlay-surface w-[min(25rem,calc(100vw-1.5rem))] rounded-2xl p-0"
        sideOffset={10}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {view.unreadCount
                ? `${view.unreadCount} unread in this business`
                : "You're all caught up"}
            </p>
          </div>
          <Button
            disabled={!view.unreadCount || isPending}
            onClick={markAllRead}
            size="sm"
            type="button"
            variant="ghost"
          >
            <CheckCheck data-icon="inline-start" />
            Mark all read
          </Button>
        </div>
        <Separator />
        <ScrollArea className="max-h-[26rem]">
          {view.items.length ? (
            <div className="flex flex-col p-2">
              {view.items.map((item) => {
                const Icon = getNotificationIcon(item.type);

                return (
                  <button
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/45",
                      item.unread ? "bg-accent/20" : "bg-transparent",
                    )}
                    key={item.id}
                    onClick={() => openNotification(item)}
                    type="button"
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background text-muted-foreground",
                        item.unread && "border-primary/15 bg-primary/8 text-primary",
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={cn(
                            "text-sm leading-5 text-foreground",
                            item.unread ? "font-semibold" : "font-medium",
                          )}
                        >
                          {item.title}
                        </p>
                        <span
                          className="shrink-0 text-[0.7rem] font-medium text-muted-foreground"
                          title={formatNotificationDateTime(item.createdAt)}
                        >
                          {formatRelativeNotificationTime(item.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">
                        {item.summary}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4">
              <Empty className="min-h-56 border-none bg-transparent p-6 shadow-none">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Inbox />
                  </EmptyMedia>
                  <EmptyTitle>No notifications yet</EmptyTitle>
                  <EmptyDescription>
                    New inquiries, quote responses, and follow-up activity will appear here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function getNotificationIcon(type: BusinessNotificationType) {
  switch (type) {
    case "public_inquiry_submitted":
      return MailPlus;
    case "quote_customer_accepted":
      return CircleCheckBig;
    case "quote_customer_rejected":
      return CircleX;
    case "business_member_invite_accepted":
      return UserCheck;
    case "business_member_invite_declined":
      return UserX;
    default:
      return Bell;
  }
}
