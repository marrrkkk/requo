"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/features/auth/components/logout-button";
import { BrandMark } from "@/components/shared/brand-mark";
import {
  dashboardNavigation,
  getActiveDashboardNavigationItem,
  isDashboardNavigationItemActive,
} from "@/components/shell/dashboard-navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  children: ReactNode;
  user: {
    email: string;
    name: string;
  };
  workspaceContext: {
    role: "owner" | "member";
    workspace: {
      id: string;
      name: string;
      slug: string;
      defaultCurrency: string;
      publicInquiryEnabled: boolean;
    };
  };
};

export function DashboardShell({
  children,
  user,
  workspaceContext,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeItem = getActiveDashboardNavigationItem(pathname);
  const workspace = workspaceContext.workspace;
  const membershipLabel =
    workspaceContext.role === "owner" ? "Owner workspace" : "Workspace member";

  return (
    <div className="page-wrap py-4 sm:py-5 lg:py-6">
      <div className="grid min-h-[calc(100vh-2rem)] gap-4 lg:grid-cols-[18.5rem_minmax(0,1fr)] xl:grid-cols-[19.5rem_minmax(0,1fr)]">
        <Card className="hidden self-start lg:flex lg:sticky lg:top-6 lg:min-h-[calc(100vh-3rem)] lg:max-h-[calc(100vh-3rem)]">
          <CardHeader className="gap-5 border-b pb-5">
            <BrandMark />
            <div className="rounded-3xl border bg-background/80 p-4 shadow-sm">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="eyebrow">{membershipLabel}</span>
                  <span className="rounded-full border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                    {workspace.defaultCurrency}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-2xl">{workspace.name}</CardTitle>
                  <CardDescription className="text-sm leading-6">
                    Routes, inboxes, and quotes stay scoped to this workspace.
                  </CardDescription>
                </div>
                <div className="rounded-2xl border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Public slug: <span className="font-medium">{workspace.slug}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4 pt-5">
            <nav aria-label="Dashboard navigation">
              <div className="flex flex-col gap-1.5">
                {dashboardNavigation.map((item) => (
                  <DashboardNavigationButton
                    key={item.href}
                    isActive={isDashboardNavigationItemActive(pathname, item.href)}
                    item={item}
                  />
                ))}
              </div>
            </nav>
            <div className="mt-auto rounded-3xl border bg-muted/35 p-4">
              <p className="text-sm font-medium text-foreground">Owner-first MVP</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The shell is ready for empty states now and feature-heavy views
                later without changing the dashboard contract.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4">
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-medium text-foreground">{user.name}</p>
              <p className="truncate text-muted-foreground">{user.email}</p>
              <p className="text-muted-foreground">
                Public intake:{" "}
                {workspace.publicInquiryEnabled ? "Enabled" : "Disabled"}
              </p>
            </div>
            <Separator />
            <LogoutButton className="w-full" />
          </CardFooter>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <header className="rounded-[1.75rem] border bg-background/85 px-4 py-4 shadow-[0_18px_60px_-42px_rgba(37,54,106,0.45)] backdrop-blur-xl sm:px-5">
            <div className="flex items-start gap-3 sm:items-center">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    className="lg:hidden"
                    size="icon-sm"
                    type="button"
                    variant="outline"
                  >
                    <Menu data-icon="inline-start" />
                    <span className="sr-only">Open dashboard navigation</span>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  className="w-[88vw] max-w-sm border-r p-0"
                  showCloseButton={false}
                  side="left"
                >
                  <SheetHeader className="gap-4 border-b bg-background/90 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <BrandMark />
                      <SheetClose asChild>
                        <Button size="icon-sm" type="button" variant="ghost">
                          <X data-icon="inline-start" />
                          <span className="sr-only">Close navigation</span>
                        </Button>
                      </SheetClose>
                    </div>
                    <div className="flex flex-col gap-2">
                      <SheetTitle>{workspace.name}</SheetTitle>
                      <SheetDescription className="leading-6">
                        {activeItem.description}
                      </SheetDescription>
                    </div>
                  </SheetHeader>
                  <div className="flex h-full flex-col">
                    <div className="flex flex-col gap-5 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="eyebrow">{membershipLabel}</span>
                        <span className="rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                          {workspace.defaultCurrency}
                        </span>
                      </div>
                      <nav aria-label="Mobile dashboard navigation">
                        <div className="flex flex-col gap-1.5">
                          {dashboardNavigation.map((item) => (
                            <DashboardNavigationButton
                              key={item.href}
                              isActive={isDashboardNavigationItemActive(
                                pathname,
                                item.href,
                              )}
                              item={item}
                              onNavigate={() => setIsMobileMenuOpen(false)}
                            />
                          ))}
                        </div>
                      </nav>
                    </div>
                    <div className="mt-auto border-t p-4">
                      <div className="mb-4 flex flex-col gap-1 text-sm">
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="truncate text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                      <LogoutButton className="w-full" />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="eyebrow hidden sm:inline-flex">
                    {membershipLabel}
                  </span>
                  <span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                    {workspace.slug}
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
                  <div className="min-w-0 flex flex-col gap-1">
                    <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                      {activeItem.label}
                    </h1>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                      {activeItem.description}
                    </p>
                  </div>
                  <div className="hidden items-center gap-3 sm:flex">
                    <div className="rounded-2xl border bg-card/70 px-3 py-2 text-right shadow-sm">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Workspace
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {workspace.name}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex min-w-0 flex-1 flex-col rounded-[1.9rem] border bg-card/80 p-4 shadow-[0_24px_80px_-44px_rgba(37,54,106,0.35)] backdrop-blur-sm sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

type DashboardNavigationButtonProps = {
  isActive: boolean;
  item: (typeof dashboardNavigation)[number];
  onNavigate?: () => void;
};

function DashboardNavigationButton({
  isActive,
  item,
  onNavigate,
}: DashboardNavigationButtonProps) {
  const Icon = item.icon;

  return (
    <Button
      asChild
      className={cn(
        "h-auto w-full justify-start rounded-2xl px-3 py-3 text-left",
        isActive &&
          "shadow-[0_14px_28px_-20px_rgba(37,54,106,0.55)] ring-1 ring-primary/10",
      )}
      size="lg"
      variant={isActive ? "secondary" : "ghost"}
    >
      <Link href={item.href} onClick={onNavigate}>
        <Icon data-icon="inline-start" />
        <span className="flex min-w-0 flex-col items-start gap-0.5">
          <span className="font-medium">{item.label}</span>
          <span className="text-xs leading-5 text-muted-foreground">
            {item.description}
          </span>
        </span>
      </Link>
    </Button>
  );
}
