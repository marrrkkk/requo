"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Menu,
  Sliders,
  User,
  Users,
} from "lucide-react";

import {
  getBusinessDashboardPath,
  getBusinessMembersPath,
  getBusinessSettingsPath,
} from "@/features/businesses/routes";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { SettingsNavigationGroup } from "@/features/settings/navigation";
import { settingsIcons } from "@/features/settings/components/settings-shell-frame";

export type MobileSettingsBottomNavProps = {
  businessSlug: string;
  groups: SettingsNavigationGroup[];
  userMenuSlot?: ReactNode;
};

export function MobileSettingsBottomNav({
  businessSlug,
  groups,
  userMenuSlot,
}: MobileSettingsBottomNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const dashboardPath = getBusinessDashboardPath(businessSlug);
  const generalPath = getBusinessSettingsPath(businessSlug, "general");
  const billingPath = getBusinessSettingsPath(businessSlug, "billing");
  const membersPath = getBusinessMembersPath(businessSlug);

  const primaryTabs = [
    {
      href: dashboardPath,
      label: "Back",
      icon: ArrowLeft,
      isActive: false,
    },
    {
      href: generalPath,
      label: "General",
      icon: Sliders,
      isActive: pathname === generalPath || pathname === getBusinessSettingsPath(businessSlug),
    },
    {
      href: billingPath,
      label: "Billing",
      icon: BriefcaseBusiness,
      isActive: pathname.startsWith(billingPath),
    },
  ];

  return (
    <>
      <nav
        aria-label="Mobile settings navigation"
        className="fixed inset-x-0 bottom-0 z-40 bg-background text-foreground pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="grid h-16 grid-cols-5 items-center px-1">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch={true}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 py-1 text-[0.68rem] transition-colors",
                  tab.isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground active:text-foreground font-medium",
                )}
              >
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full transition-transform",
                    tab.isActive && "bg-primary/10 text-primary",
                  )}
                >
                  <Icon className={cn("size-4", tab.isActive ? "text-primary" : "text-muted-foreground")} />
                </div>
                <span className="truncate leading-none">{tab.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className={cn(
              "flex h-full flex-col items-center justify-center gap-1 py-1 text-[0.68rem] transition-colors",
              menuOpen
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground active:text-foreground font-medium",
            )}
          >
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-full transition-transform",
                menuOpen && "bg-primary/10 text-primary",
              )}
            >
              <Menu className={cn("size-4", menuOpen ? "text-primary" : "text-muted-foreground")} />
            </div>
            <span className="truncate leading-none">All</span>
          </button>
        </div>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-4 pt-4 pb-8"
        >
          <SheetHeader className="pb-3 text-left">
            <SheetTitle>All Settings</SheetTitle>
            <SheetDescription className="sr-only">
              Browse all settings categories
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <div key={group.label} className="flex flex-col gap-1 rounded-xl border border-border/70 bg-muted/20 p-2">
                <span className="meta-label px-3 py-1 text-xs text-muted-foreground">
                  {group.label}
                </span>
                {group.items.map((item) => {
                  const Icon = settingsIcons[item.icon] ?? User;
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-primary/12 text-primary font-semibold"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      <Icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}

            {userMenuSlot ? (
              <div className="rounded-xl border border-border/70 bg-muted/20 p-2" onClick={() => setMenuOpen(false)}>
                {userMenuSlot}
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
