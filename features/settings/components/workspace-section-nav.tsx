"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getWorkspaceSectionNavigation } from "@/features/settings/navigation";
import { getWorkspaceDashboardSlugFromPathname } from "@/features/workspaces/routes";
import { cn } from "@/lib/utils";

export function WorkspaceSectionNav() {
  const pathname = usePathname();
  const slug = getWorkspaceDashboardSlugFromPathname(pathname);

  if (!slug) {
    return null;
  }

  const workspaceSectionNavigation = getWorkspaceSectionNavigation(slug);

  return (
    <section className="section-panel overflow-hidden">
      <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
        {workspaceSectionNavigation.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              className={cn(
                "soft-panel flex min-h-28 items-start gap-3 px-4 py-4 transition-colors",
                isActive
                  ? "border-primary/20 bg-accent/52 shadow-[inset_0_1px_0_rgba(255,255,255,0.38)]"
                  : "hover:bg-accent/30",
              )}
              href={item.href}
              key={item.href}
              prefetch={false}
            >
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/92 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.36)]",
                  isActive && "border-primary/20 bg-primary/10 text-primary",
                )}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  {item.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
