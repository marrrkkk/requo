import Link from "next/link";

import { BrandWordmark } from "@/components/shared/brand-wordmark";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type BrandMarkSize = "default" | "lg";

type BrandMarkProps = {
  className?: string;
  collapseLabel?: boolean;
  subtitle?: string | null;
  href?: string;
  size?: BrandMarkSize;
};

const wordmarkSizeClass: Record<BrandMarkSize, string> = {
  default: "",
  lg: "text-[1.45rem] tracking-[-0.02em] sm:text-[1.55rem]",
};

const avatarSizeClass: Record<BrandMarkSize, string> = {
  default: "size-10",
  lg: "size-11",
};

export function BrandMark({
  className,
  collapseLabel = false,
  subtitle = "Owner-led service",
  href = "/",
  size = "default",
}: BrandMarkProps) {
  return (
    <Link
      href={href}
      aria-label="Requo"
      className={cn(
        "inline-flex items-center gap-3 text-foreground",
        collapseLabel && "group-data-[collapsible=icon]:gap-0",
        className,
      )}
    >
      <Avatar
        size="lg"
        className={cn(
          "shrink-0 rounded-xl border border-border/70 bg-background/80 shadow-sm dark:border-white/8 dark:bg-card dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_1px_1px_rgba(0,0,0,0.2)]",
          avatarSizeClass[size],
        )}
      >
        <AvatarImage src="/logo.svg" alt="" className="rounded-none object-contain p-1.5" />
        <AvatarFallback className="rounded-xl font-heading text-sm font-semibold text-foreground">
          R
        </AvatarFallback>
      </Avatar>
      <span
        className={cn(
          "flex min-w-0 flex-col leading-none",
          collapseLabel && "group-data-[collapsible=icon]:hidden",
        )}
      >
        <BrandWordmark className={cn("truncate", wordmarkSizeClass[size])} />
        {subtitle !== null ? (
          <span className="truncate text-[0.64rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
