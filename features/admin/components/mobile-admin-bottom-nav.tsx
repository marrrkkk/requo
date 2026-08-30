"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  adminNavigation,
  isAdminNavigationItemActive,
} from "@/features/admin/navigation";
import { cn } from "@/lib/utils";

export function MobileAdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile admin navigation"
      className="fixed inset-x-0 bottom-0 z-40 bg-background text-foreground pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="grid h-16 grid-cols-4 items-center px-1">
        {adminNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = isAdminNavigationItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "flex h-full flex-col items-center justify-center gap-1 py-1 text-[0.74rem] transition-colors",
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground active:text-foreground font-medium",
              )}
            >
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-full transition-transform",
                  isActive && "bg-primary/10 text-primary",
                )}
              >
                <Icon className={cn("size-4", isActive ? "text-primary" : "text-muted-foreground")} />
              </div>
              <span className="truncate leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
