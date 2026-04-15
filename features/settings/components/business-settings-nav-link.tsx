"use client";

import type { ReactNode } from "react";

import Link from "next/link";

import { cn } from "@/lib/utils";

type BusinessSettingsNavLinkProps = {
  href: string;
  label: string;
  isActive: boolean;
  children: ReactNode;
};

export function BusinessSettingsNavLink({
  href,
  label,
  isActive,
  children,
}: BusinessSettingsNavLinkProps) {
  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-[0.9rem] font-medium tracking-tight transition-[border-color,background-color,color,box-shadow]",
        isActive
          ? "border-border/75 bg-accent/35 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          : "border-transparent text-muted-foreground hover:border-border/55 hover:bg-accent/16 hover:text-foreground",
      )}
      href={href}
      prefetch={true}
    >
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md text-current transition-colors",
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {children}
      </div>

      <span className="min-w-0 truncate leading-tight">{label}</span>
    </Link>
  );
}
