"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type BusinessSettingsNavLinkProps = {
  href: string;
  label: string;
  description: string;
  children: ReactNode;
};

export function BusinessSettingsNavLink({
  href,
  label,
  description,
  children,
}: BusinessSettingsNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group rounded-lg border px-3 py-3 transition-colors",
        isActive
          ? "border-border/80 bg-accent/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          : "border-transparent hover:border-border/70 hover:bg-accent/18",
      )}
      href={href}
      prefetch={true}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
            isActive
              ? "border-border/75 bg-background/92 text-foreground"
              : "border-border/65 bg-background/70 text-muted-foreground group-hover:text-foreground",
          )}
        >
          {children}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {label}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}
