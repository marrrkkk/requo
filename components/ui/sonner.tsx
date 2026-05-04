"use client"

import { useTheme } from "@/components/theme-provider"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error: "group-[.toaster]:!bg-[color-mix(in_oklab,var(--color-destructive)_10%,var(--color-background))] group-[.toaster]:!text-destructive group-[.toaster]:!border-destructive",
          success: "group-[.toaster]:!bg-[color-mix(in_oklab,var(--color-primary)_10%,var(--color-background))] group-[.toaster]:!text-primary group-[.toaster]:!border-primary",
          warning: "group-[.toaster]:!bg-[color-mix(in_oklab,var(--color-amber-500)_10%,var(--color-background))] group-[.toaster]:!text-amber-600 dark:group-[.toaster]:!text-amber-500 group-[.toaster]:!border-amber-600 dark:group-[.toaster]:!border-amber-500",
          info: "group-[.toaster]:!bg-[color-mix(in_oklab,var(--color-sky-500)_10%,var(--color-background))] group-[.toaster]:!text-sky-600 dark:group-[.toaster]:!text-sky-500 group-[.toaster]:!border-sky-600 dark:group-[.toaster]:!border-sky-500",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

