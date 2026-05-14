"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  FileText,
  Inbox,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type NeedsAttentionIconName = "inbox" | "file-text" | "bell-ring" | "check-circle";

type NeedsAttentionModalItem = {
  href: string;
  key: string;
  label: string;
  title: string;
  description: string;
  meta: string;
  actionLabel: string;
  tone: "urgent" | "normal" | "positive";
  iconName: NeedsAttentionIconName;
  category?: "Inquiry" | "Quote" | "Follow-up";
};

const iconMap: Record<NeedsAttentionIconName, LucideIcon> = {
  "inbox": Inbox,
  "file-text": FileText,
  "bell-ring": BellRing,
  "check-circle": CheckCircle2,
};

export function NeedsAttentionSeeMore({
  items,
}: {
  items: NeedsAttentionModalItem[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mt-3 flex justify-center">
        <Button
          onClick={() => setOpen(true)}
          size="sm"
          type="button"
          variant="ghost"
        >
          See more
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Needs attention</DialogTitle>
            <DialogDescription>
              All items waiting on the next step.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="max-h-[60vh] overflow-y-auto">
            <div className="flex flex-col divide-y divide-border/70">
              {items.map((item) => (
                <NeedsAttentionModalRow
                  item={item}
                  key={item.key}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NeedsAttentionModalRow({
  item,
  onNavigate,
}: {
  item: NeedsAttentionModalItem;
  onNavigate: () => void;
}) {
  const Icon = iconMap[item.iconName];

  return (
    <Link
      className="group flex items-center gap-4 px-1 py-3.5 transition-colors hover:bg-accent/22 sm:px-2"
      href={item.href}
      onClick={onNavigate}
      prefetch={true}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          item.tone === "urgent" && "bg-destructive/10 text-destructive",
          item.tone === "normal" && "bg-primary/10 text-primary",
          item.tone === "positive" && "bg-green-500/10 text-green-600 dark:text-green-400",
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {item.title}
          </p>
          {item.category ? (
            <span className="shrink-0 text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground/70">
              {item.category}
            </span>
          ) : null}
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {item.description}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.meta}</p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}
