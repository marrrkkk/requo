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
      gap={12}
      mobileOffset={{
        left: 12,
        right: 12,
        top: 12,
      }}
      offset={{
        right: 16,
        top: 16,
      }}
      expand={false}
      position="top-right"
      theme={resolvedTheme}
      visibleToasts={4}
      toastOptions={{
        ...toastOptions,
        classNames: {
          toast: cn(
            "group toast relative flex w-full items-start gap-3 overflow-visible rounded-xl border p-4 pr-12 sm:gap-4 sm:p-4.5 sm:pr-13",
            "surface-card supports-[backdrop-filter]:backdrop-blur-md",
            "before:pointer-events-none before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-full before:bg-border/65 before:content-['']",
            "data-[type=success]:border-primary/18 data-[type=success]:before:bg-primary/82",
            "data-[type=error]:border-destructive/22 data-[type=error]:before:bg-destructive/85",
            "data-[type=info]:before:bg-primary/62",
            "data-[type=warning]:before:bg-foreground/36",
            "data-[type=loading]:before:bg-primary/58",
            toastOptions?.classNames?.toast,
          ),
          content: cn(
            "flex min-w-0 flex-1 flex-col gap-1 pt-0.5",
            toastOptions?.classNames?.content,
          ),
          title: cn(
            "font-heading text-[0.94rem] leading-5 font-semibold tracking-tight text-foreground",
            toastOptions?.classNames?.title,
          ),
          description: cn(
            "text-sm leading-5 text-balance text-muted-foreground",
            toastOptions?.classNames?.description,
          ),
          icon: cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/75 bg-secondary/72 text-muted-foreground shadow-[var(--control-shadow)] [&_svg]:size-[1rem]",
            "group-data-[type=success]:border-primary/18 group-data-[type=success]:bg-primary/10 group-data-[type=success]:text-primary",
            "group-data-[type=error]:border-destructive/18 group-data-[type=error]:bg-destructive/10 group-data-[type=error]:text-destructive",
            "group-data-[type=loading]:border-primary/14 group-data-[type=loading]:bg-primary/8 group-data-[type=loading]:text-primary",
            "group-data-[type=info]:border-primary/14 group-data-[type=info]:bg-primary/8 group-data-[type=info]:text-primary",
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
            "button-primary-fixed h-9 rounded-lg border px-3.5 text-sm font-medium text-primary-foreground transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15",
            toastOptions?.classNames?.actionButton,
          ),
          cancelButton: cn(
            "control-surface-secondary h-9 rounded-lg border px-3.5 text-sm font-medium text-foreground transition-[background-color,border-color,color,box-shadow] duration-150 hover:bg-[var(--control-secondary-bg-strong)] hover:text-foreground hover:shadow-[var(--control-shadow-hover)] focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15",
            toastOptions?.classNames?.cancelButton,
          ),
          closeButton: cn(
            "!left-auto !right-3 !top-3 !size-8 !translate-x-0 !translate-y-0 rounded-full border border-border/75 bg-background/92 text-muted-foreground shadow-[var(--control-shadow)] transition-[background-color,border-color,color,box-shadow] duration-150 hover:bg-accent hover:text-foreground hover:shadow-[var(--control-shadow-hover)] focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 supports-[backdrop-filter]:backdrop-blur-sm",
            toastOptions?.classNames?.closeButton,
          ),
        },
      }}
      {...props}
    />
  );
}
