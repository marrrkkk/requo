import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "control-surface flex field-sizing-content min-h-32 w-full rounded-md border border-input/95 px-3 py-2 text-base transition-[border-color,background-color,box-shadow] outline-none placeholder:text-muted-foreground/90 focus-visible:border-ring focus-visible:bg-[var(--control-bg-strong)] focus-visible:ring-4 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted/70 disabled:shadow-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/10 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
