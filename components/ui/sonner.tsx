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
            "group toast rounded-2xl border border-border/80 bg-background/96 text-foreground shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/88",
            toastOptions?.classNames?.toast,
          ),
          title: cn(
            "text-sm font-medium text-foreground",
            toastOptions?.classNames?.title,
          ),
          description: cn(
            "text-sm text-muted-foreground",
            toastOptions?.classNames?.description,
          ),
          success: cn("border-border/80", toastOptions?.classNames?.success),
          error: cn(
            "border-destructive/25",
            toastOptions?.classNames?.error,
          ),
          actionButton: cn(
            "rounded-xl bg-primary text-primary-foreground",
            toastOptions?.classNames?.actionButton,
          ),
          cancelButton: cn(
            "rounded-xl bg-muted text-muted-foreground",
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
