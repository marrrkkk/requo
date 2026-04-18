import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type InViewRevealProps = HTMLAttributes<HTMLDivElement> & {
  animation?: "card" | "pop";
  delay?: number;
  once?: boolean;
  rootMargin?: string;
  threshold?: number | number[];
};

export function InViewReveal({
  animation,
  children,
  className,
  delay,
  once,
  rootMargin,
  style,
  threshold,
  ...props
}: InViewRevealProps) {
  void animation;
  void delay;
  void once;
  void rootMargin;
  void threshold;

  return (
    <div
      {...props}
      className={cn(className)}
      style={style}
    >
      {children}
    </div>
  );
}
