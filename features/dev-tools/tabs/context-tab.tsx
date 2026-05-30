"use client";

import {
  Copy,
  CreditCard,
  RefreshCw,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { PLANS, type UserContext } from "./types";

export function ContextTab({
  context,
  loading,
  switching,
  onSwitchPlan,
  onRefresh,
  onCopy,
}: {
  context: UserContext | null;
  loading: boolean;
  switching: boolean;
  onSwitchPlan: (plan: string) => void;
  onRefresh: () => void;
  onCopy: (text: string, label: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="size-3 animate-spin" />
        Loading...
      </div>
    );
  }

  if (!context?.authenticated) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Not authenticated. Sign in to use dev tools.
        </div>
        <Button variant="outline" size="xs" onClick={onRefresh}>
          <RefreshCw className="size-3" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* User section */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            <User className="size-3" />
            User
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onCopy(context.user?.id ?? "", "user ID")}
              >
                <Copy className="size-2.5" />
                <span className="sr-only">Copy user ID</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy user ID</TooltipContent>
          </Tooltip>
        </div>
        <div className="rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
          <div className="font-medium">{context.user?.name}</div>
          <div className="text-muted-foreground">{context.user?.email}</div>
          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
            {context.user?.id}
          </div>
        </div>
      </section>

      {/* Subscription section */}
      <section className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          <CreditCard className="size-3" />
          Subscription
        </div>
        <div className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
          <span className="font-medium capitalize">
            {context.subscription?.plan ?? "free"}
          </span>
          <Badge
            variant={
              context.subscription?.status === "active"
                ? "default"
                : "secondary"
            }
            className="h-4 px-1.5 text-[10px]"
          >
            {context.subscription?.status ?? "no subscription"}
          </Badge>
          {context.subscription?.canceledAt && (
            <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
              canceling
            </Badge>
          )}
        </div>

        {/* Plan switcher */}
        <div className="flex gap-1.5">
          {PLANS.map((plan) => {
            const isActive = plan === (context.subscription?.plan ?? "free");
            return (
              <Button
                key={plan}
                variant={isActive ? "default" : "outline"}
                size="xs"
                disabled={isActive || switching}
                onClick={() => onSwitchPlan(plan)}
                className="flex-1 capitalize"
              >
                {plan}
              </Button>
            );
          })}
        </div>
      </section>

      {/* Businesses */}
      {context.businesses.length > 0 && (
        <section className="space-y-1.5">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Businesses ({context.businesses.length})
          </div>
          <div className="space-y-1">
            {context.businesses.map((biz) => (
              <div
                key={biz.id}
                className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5 text-xs"
              >
                <div>
                  <span className="font-medium">{biz.name}</span>
                  <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                    /{biz.slug}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="h-4 px-1.5 text-[10px] capitalize"
                >
                  {biz.plan}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Refresh */}
      <div className="border-t border-border/40 pt-2">
        <Button
          variant="ghost"
          size="xs"
          onClick={onRefresh}
          className="w-full gap-1.5"
        >
          <RefreshCw className="size-3" />
          Refresh Context
        </Button>
      </div>
    </div>
  );
}
