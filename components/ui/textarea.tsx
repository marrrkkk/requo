import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-28 w-full rounded-lg border border-input bg-background px-3.5 py-3 text-base shadow-xs transition-[border-color,background-color,box-shadow] outline-none placeholder:text-muted-foreground/90 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted/70 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/10 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
