"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function Toaster({ className, toastOptions, ...props }: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      className={cn("toaster toast-layer group", className)}
      closeButton
      expand={false}
      position="top-right"
      theme={resolvedTheme}
      toastOptions={{
        ...toastOptions,
        classNames: {
          toast: cn(
            "group toast relative flex w-full items-start gap-4 overflow-hidden surface-card p-5 sm:p-5.5",
            "before:pointer-events-none before:absolute before:inset-y-4 before:left-0 before:w-[3px] before:rounded-full before:bg-border/65 before:content-['']",
            "data-[type=success]:border-primary/18 data-[type=success]:before:bg-primary/82",
            "data-[type=error]:border-destructive/22 data-[type=error]:before:bg-destructive/85",
            "data-[type=loading]:before:bg-primary/58",
            toastOptions?.classNames?.toast,
          ),
          content: cn(
            "flex min-w-0 flex-1 flex-col gap-1 pt-0.5",
            toastOptions?.classNames?.content,
          ),
          title: cn(
            "font-heading text-[0.94rem] font-semibold tracking-tight text-foreground",
            toastOptions?.classNames?.title,
          ),
          description: cn(
            "text-sm leading-5 text-balance text-muted-foreground",
            toastOptions?.classNames?.description,
          ),
          icon: cn(
            "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/75 bg-secondary/72 text-muted-foreground shadow-[var(--control-shadow)] [&_svg]:size-[1.05rem]",
            "group-data-[type=success]:border-primary/18 group-data-[type=success]:bg-primary/10 group-data-[type=success]:text-primary",
            "group-data-[type=error]:border-destructive/18 group-data-[type=error]:bg-destructive/10 group-data-[type=error]:text-destructive",
            "group-data-[type=loading]:border-primary/14 group-data-[type=loading]:bg-primary/8 group-data-[type=loading]:text-primary",
            toastOptions?.classNames?.icon,
          ),
          loader: cn("text-primary", toastOptions?.classNames?.loader),
          success: cn(toastOptions?.classNames?.success),
          error: cn(toastOptions?.classNames?.error),
          default: cn(toastOptions?.classNames?.default),
          loading: cn(toastOptions?.classNames?.loading),
          info: cn(toastOptions?.classNames?.info),
          warning: cn(toastOptions?.classNames?.warning),
          actionButton: cn(
            "control-surface rounded-xl px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-foreground",
            toastOptions?.classNames?.actionButton,
          ),
          cancelButton: cn(
            "rounded-xl bg-muted/82 px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            toastOptions?.classNames?.cancelButton,
          ),
          closeButton: cn(
            "control-surface rounded-full bg-background/86 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            toastOptions?.classNames?.closeButton,
          ),
        },
      }}
      {...props}
    />
  );
}
