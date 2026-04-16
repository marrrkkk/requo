"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function Toaster({ className, toastOptions, ...props }: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      className={cn("toaster group", className)}
      closeButton
      expand={false}
      position="top-right"
      theme={resolvedTheme}
      toastOptions={{
        ...toastOptions,
        classNames: {
          toast: cn(
            "group toast flex w-full flex-col gap-3 surface-card p-5 sm:p-6 backdrop-blur supports-[backdrop-filter]:bg-background/88 sm:flex-row sm:items-start sm:gap-4",
            "data-[type=success]:![background:var(--alert-surface-bg)] data-[type=success]:!border-primary/20",
            "data-[type=error]:![background:var(--alert-destructive-surface-bg)] data-[type=error]:!border-destructive/20",
            toastOptions?.classNames?.toast,
          ),
          title: cn(
            "font-heading text-[0.92rem] font-semibold text-foreground group-data-[type=error]:text-destructive",
            toastOptions?.classNames?.title,
          ),
          description: cn(
            "text-sm text-balance text-muted-foreground group-data-[type=error]:text-destructive/88",
            toastOptions?.classNames?.description,
          ),
          icon: cn(
            "group-data-[type=success]:text-primary group-data-[type=error]:text-destructive",
            toastOptions?.classNames?.icon,
          ),
          success: cn(toastOptions?.classNames?.success),
          error: cn(toastOptions?.classNames?.error),
          actionButton: cn(
            "rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
            toastOptions?.classNames?.actionButton,
          ),
          cancelButton: cn(
            "rounded-xl bg-muted px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            toastOptions?.classNames?.cancelButton,
          ),
          closeButton: cn(
            "rounded-full border border-border/80 bg-background/92 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            toastOptions?.classNames?.closeButton,
          ),
        },
      }}
      {...props}
    />
  );
}
