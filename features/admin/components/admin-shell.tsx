"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import { adminNavigationItems } from "@/features/admin/constants";
import type { AdminContext } from "@/features/admin/types";
import { cn } from "@/lib/utils";

type AdminShellProps = {
  admin: AdminContext;
  children: ReactNode;
};

function isActive(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ admin, children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[4.5rem] w-full max-w-7xl flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:py-0">
          <div className="flex min-w-0 items-center justify-between gap-4">
            <BrandMark href="/admin" subtitle="Internal admin" />
            <div className="hidden min-w-0 text-right text-xs text-muted-foreground sm:block lg:hidden">
              <p className="truncate">{admin.email}</p>
            </div>
          </div>

          <nav className="flex min-w-0 gap-1 overflow-x-auto pb-1 lg:pb-0">
            {adminNavigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);

              return (
                <Button
                  asChild
                  className={cn(
                    "shrink-0 justify-start",
                    active && "bg-[var(--control-accent-bg)] text-foreground",
                  )}
                  key={item.href}
                  size="sm"
                  variant={active ? "outline" : "ghost"}
                >
                  <Link href={item.href}>
                    <Icon data-icon="inline-start" className="size-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>

          <div className="hidden min-w-0 text-right text-xs text-muted-foreground lg:block">
            <p className="truncate">{admin.email}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
