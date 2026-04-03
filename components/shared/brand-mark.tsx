import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  collapseLabel?: boolean;
  subtitle?: string | null;
};

export function BrandMark({
  className,
  collapseLabel = false,
  subtitle = "Owner workspace",
}: BrandMarkProps) {
  return (
    <Link
      href="/"
      aria-label="Relay"
      className={cn(
        "inline-flex items-center gap-3 text-foreground",
        collapseLabel && "group-data-[collapsible=icon]:gap-0",
        className,
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/80 shadow-sm">
        <Image
          src="/logo.svg"
          alt=""
          width={24}
          height={24}
          className="size-6"
        />
      </span>
      <span
        className={cn(
          "flex min-w-0 flex-col leading-none",
          collapseLabel && "group-data-[collapsible=icon]:hidden",
        )}
      >
        <span className="truncate font-heading text-[1.02rem] font-semibold tracking-tight">
          Relay
        </span>
        {subtitle !== null ? (
          <span className="truncate text-[0.64rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
