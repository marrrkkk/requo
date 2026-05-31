"use client";

import { cn } from "@/lib/utils";

export type LoaderProps = {
  variant?: "dots" | "typing";
  size?: "sm" | "md";
  className?: string;
};

function DotsLoader({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const dotSizes = {
    sm: "size-1.5",
    md: "size-2",
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "animate-[bounce-dots_1.4s_ease-in-out_infinite] rounded-full bg-muted-foreground/60",
            dotSizes[size],
          )}
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

function TypingLoader({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const dotSizes = {
    sm: "size-1",
    md: "size-1.5",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-lg bg-muted/60 px-3 py-2",
        className,
      )}
    >
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "animate-[bounce-dots_1.4s_ease-in-out_infinite] rounded-full bg-muted-foreground/50",
            dotSizes[size],
          )}
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
      <span className="sr-only">AI is thinking</span>
    </div>
  );
}

function Loader({ variant = "dots", size = "md", className }: LoaderProps) {
  switch (variant) {
    case "typing":
      return <TypingLoader className={className} size={size} />;
    case "dots":
    default:
      return <DotsLoader className={className} size={size} />;
  }
}

export { Loader, DotsLoader, TypingLoader };
