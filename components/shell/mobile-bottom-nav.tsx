"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BellRing,
  FileText,
  FormInput,
  Home,
  Inbox,
  LayoutGrid,
  Package,
  Users,
  Settings,
} from "lucide-react";

import {
  getBusinessAnalyticsPath,
  getBusinessDashboardPath,
  getBusinessFollowUpsPath,
  getBusinessFormsPath,
  getBusinessInquiriesPath,
  getBusinessMembersPath,
  getBusinessProductsPath,
  getBusinessQuotesPath,
  getBusinessSettingsPath,
} from "@/features/businesses/routes";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { BusinessAvatar } from "@/components/shared/business-avatar";
import { cn } from "@/lib/utils";
import { canViewBusinessAnalytics, type BusinessMemberRole } from "@/lib/business-members";
import { isDashboardNavigationItemActive } from "@/components/shell/dashboard-navigation";

export type MobileBottomNavProps = {
  businessSlug: string;
  businessName?: string;
  businessLogoUrl?: string | null;
  role?: BusinessMemberRole;
  checklistSlot?: ReactNode;
};

export function MobileBottomNav({
  businessSlug,
  role = "owner",
  checklistSlot,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const homeHref = getBusinessDashboardPath(businessSlug);
  const inquiriesHref = getBusinessInquiriesPath(businessSlug);
  const quotesHref = getBusinessQuotesPath(businessSlug);
  const followUpsHref = getBusinessFollowUpsPath(businessSlug);
  const formsHref = getBusinessFormsPath(businessSlug);
  const productsHref = getBusinessProductsPath(businessSlug);
  const membersHref = getBusinessMembersPath(businessSlug);
  const analyticsHref = getBusinessAnalyticsPath(businessSlug);
  const settingsHref = getBusinessSettingsPath(businessSlug, "general");

  const isHomeActive = isDashboardNavigationItemActive(pathname, homeHref);
  const isInquiriesActive = isDashboardNavigationItemActive(pathname, inquiriesHref);
  const isQuotesActive = isDashboardNavigationItemActive(pathname, quotesHref);
  const isFollowUpsActive = isDashboardNavigationItemActive(pathname, followUpsHref);
  const isFormsActive = isDashboardNavigationItemActive(pathname, formsHref);
  const isProductsActive = isDashboardNavigationItemActive(pathname, productsHref);
  const isMembersActive = isDashboardNavigationItemActive(pathname, membersHref);
  const isAnalyticsActive = canViewBusinessAnalytics(role) && isDashboardNavigationItemActive(pathname, analyticsHref);

  const isMoreActive =
    isFormsActive ||
    isProductsActive ||
    isMembersActive ||
    isAnalyticsActive ||
    pathname.includes("/settings");

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 bg-background/95 border-t border-border/70 backdrop-blur supports-backdrop-filter:bg-background/85 text-foreground pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="grid h-14 grid-cols-5 items-center px-1">
          {/* 1. Home */}
          <Link
            href={homeHref}
            prefetch={true}
            className={cn(
              "flex h-full flex-col items-center justify-center gap-0.5 py-1 text-[0.65rem] transition-colors active:scale-95",
              isHomeActive
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground active:text-foreground font-medium",
            )}
          >
            <div
              className={cn(
                "flex size-6 items-center justify-center rounded-full transition-transform",
                isHomeActive && "bg-primary/10 text-primary",
              )}
            >
              <Home className={cn("size-4", isHomeActive ? "text-primary" : "text-muted-foreground")} />
            </div>
            <span className="truncate leading-none">Home</span>
          </Link>

          {/* 2. Inquiries */}
          <Link
            href={inquiriesHref}
            prefetch={true}
            className={cn(
              "flex h-full flex-col items-center justify-center gap-0.5 py-1 text-[0.65rem] transition-colors active:scale-95",
              isInquiriesActive
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground active:text-foreground font-medium",
            )}
          >
            <div
              className={cn(
                "flex size-6 items-center justify-center rounded-full transition-transform",
                isInquiriesActive && "bg-primary/10 text-primary",
              )}
            >
              <Inbox className={cn("size-4", isInquiriesActive ? "text-primary" : "text-muted-foreground")} />
            </div>
            <span className="truncate leading-none">Inquiries</span>
          </Link>

          {/* 3. Quotes */}
          <Link
            href={quotesHref}
            prefetch={true}
            className={cn(
              "flex h-full flex-col items-center justify-center gap-0.5 py-1 text-[0.65rem] transition-colors active:scale-95",
              isQuotesActive
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground active:text-foreground font-medium",
            )}
          >
            <div
              className={cn(
                "flex size-6 items-center justify-center rounded-full transition-transform",
                isQuotesActive && "bg-primary/10 text-primary",
              )}
            >
              <FileText className={cn("size-4", isQuotesActive ? "text-primary" : "text-muted-foreground")} />
            </div>
            <span className="truncate leading-none">Quotes</span>
          </Link>

          {/* 4. Follow-ups */}
          <Link
            href={followUpsHref}
            prefetch={true}
            className={cn(
              "flex h-full flex-col items-center justify-center gap-0.5 py-1 text-[0.65rem] transition-colors active:scale-95",
              isFollowUpsActive
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground active:text-foreground font-medium",
            )}
          >
            <div
              className={cn(
                "flex size-6 items-center justify-center rounded-full transition-transform",
                isFollowUpsActive && "bg-primary/10 text-primary",
              )}
            >
              <BellRing className={cn("size-4", isFollowUpsActive ? "text-primary" : "text-muted-foreground")} />
            </div>
            <span className="truncate leading-none">Follow-ups</span>
          </Link>

          {/* 5. More */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex h-full flex-col items-center justify-center gap-0.5 py-1 text-[0.65rem] transition-colors active:scale-95",
              isMoreActive || moreOpen
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground active:text-foreground font-medium",
            )}
          >
            <div
              className={cn(
                "flex size-6 items-center justify-center rounded-full transition-transform",
                (isMoreActive || moreOpen) && "bg-primary/10 text-primary",
              )}
            >
              <LayoutGrid className={cn("size-4", (isMoreActive || moreOpen) ? "text-primary" : "text-muted-foreground")} />
            </div>
            <span className="truncate leading-none">More</span>
          </button>
        </div>
      </nav>

      {/* More Options Drawer Sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-4 pt-4 pb-8"
        >
          <SheetHeader className="pb-3 text-left">
            <SheetTitle>More</SheetTitle>
            <SheetDescription className="sr-only">
              Forms, products, team members, analytics, and settings
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4">
            {/* Secondary Navigation */}
            <div className="flex flex-col gap-1 rounded-xl border border-border/70 bg-muted/20 p-2">
              <Link
                href={formsHref}
                prefetch={true}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isFormsActive
                    ? "bg-sidebar-primary/12 text-primary font-semibold"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <FormInput className="size-4 shrink-0 text-muted-foreground" />
                <span>Forms</span>
              </Link>

              <Link
                href={productsHref}
                prefetch={true}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isProductsActive
                    ? "bg-sidebar-primary/12 text-primary font-semibold"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <Package className="size-4 shrink-0 text-muted-foreground" />
                <span>Products</span>
              </Link>

              <Link
                href={membersHref}
                prefetch={true}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isMembersActive
                    ? "bg-sidebar-primary/12 text-primary font-semibold"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <Users className="size-4 shrink-0 text-muted-foreground" />
                <span>Members</span>
              </Link>

              {canViewBusinessAnalytics(role) ? (
                <Link
                  href={analyticsHref}
                  prefetch={true}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isAnalyticsActive
                      ? "bg-sidebar-primary/12 text-primary font-semibold"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <BarChart3 className="size-4 shrink-0 text-muted-foreground" />
                  <span>Analytics</span>
                </Link>
              ) : null}

              <Link
                href={settingsHref}
                prefetch={true}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname.includes("/settings")
                    ? "bg-sidebar-primary/12 text-primary font-semibold"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <Settings className="size-4 shrink-0 text-muted-foreground" />
                <span>Settings</span>
              </Link>
            </div>

            {checklistSlot ? (
              <div onClick={() => setMoreOpen(false)}>
                {checklistSlot}
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
