"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { NavigationMenuLink } from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

export function MarketingMenuLink({
  href,
  icon: Icon,
  title,
  description,
  className,
  onNavigate,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <NavigationMenuLink asChild>
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          "flex items-start gap-3 rounded-xl px-2.5 py-2.5 outline-none transition-colors hover:bg-accent focus-visible:bg-accent",
          className
        )}
      >
        <span className="border button-primary-fixed flex size-9 shrink-0 items-center justify-center rounded-md">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm leading-snug font-semibold text-foreground">
            {title}
          </span>
          <span className="text-xs leading-snug text-muted-foreground">
            {description}
          </span>
        </span>
      </Link>
    </NavigationMenuLink>
  );
}
