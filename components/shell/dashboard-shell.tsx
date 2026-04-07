"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { useTransition } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronsUpDown,
  LogOut,
  PanelsTopLeft,
  Settings2,
  User,
} from "lucide-react";
import { usePathname } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import { accountProfilePath } from "@/features/account/routes";
import { AppearanceMenuSubmenu } from "@/features/theme/components/appearance-menu";
import { DashboardNotificationBell } from "@/features/notifications/components/dashboard-notification-bell";
import type { BusinessNotificationBellView } from "@/features/notifications/types";
import { ThemePreferenceSync } from "@/features/theme/components/theme-preference-sync";
import type { ThemePreference } from "@/features/theme/types";
import type { BusinessContext } from "@/lib/db/business-access";
import { BrandMark } from "@/components/shared/brand-mark";
import {
  getDashboardBreadcrumbs,
  getDashboardNavigation,
  isDashboardNavigationItemActive,
} from "@/components/shell/dashboard-navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  getBusinessDashboardPath,
  getBusinessSettingsPath,
  businessesHubPath,
} from "@/features/businesses/routes";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  children: ReactNode;
  themePreference: ThemePreference;
  user: {
    id: string;
    email: string;
    name: string;
  };
  businessContext: BusinessContext;
  businessMemberships: BusinessContext[];
  notificationView: BusinessNotificationBellView;
};

export function DashboardShell({
  children,
  themePreference,
  user,
  businessContext,
  businessMemberships,
  notificationView,
}: DashboardShellProps) {
  const pathname = usePathname();
  const breadcrumbs = getDashboardBreadcrumbs(pathname);
  const dashboardNavigation = getDashboardNavigation(businessContext.business.slug);
  const business = businessContext.business;

  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": "17.5rem",
          "--sidebar-width-icon": "4.25rem",
        } as CSSProperties
      }
    >
      <ThemePreferenceSync
        themePreference={themePreference}
        userId={user.id}
      />
      <Sidebar collapsible="icon">
        <SidebarHeader className="gap-0 px-0 py-0">
          <div className="flex h-[4.5rem] items-center px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
            <BrandMark
              collapseLabel
              className="min-w-0 px-2 py-1.5"
              subtitle={null}
            />
          </div>
          <SidebarSeparator />
          <div className="px-3 py-3 group-data-[collapsible=icon]:hidden">
            <BusinessSwitcher
              currentBusiness={businessContext}
              memberships={businessMemberships}
            />
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-4 px-1 pb-3 group-data-[collapsible=icon]:px-0">
          <SidebarGroup className="px-3 pt-3 group-data-[collapsible=icon]:px-2">
            <SidebarMenu>
              {dashboardNavigation.map((item) => (
                <DashboardNavigationItem
                  isActive={isDashboardNavigationItemActive(pathname, item.href)}
                  item={item}
                  key={item.href}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarSeparator />

        <SidebarFooter className="p-3 pt-2 group-data-[collapsible=icon]:px-2">
          <DashboardUserMenu user={user} businessSlug={business.slug} />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-svh min-w-0">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-inner">
            <div className="flex min-h-11 min-w-0 flex-wrap items-center gap-3 md:flex-nowrap">
              <SidebarTrigger className="shrink-0" />
              <span
                aria-hidden="true"
                className="hidden h-4 w-px shrink-0 self-center bg-border md:block"
              />
              <div className="min-w-0 flex-1">
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((item, index) => {
                      const isLast = index === breadcrumbs.length - 1;

                      return (
                        <Fragment key={`${item.label}-${item.href ?? index}`}>
                          {index > 0 ? <BreadcrumbSeparator /> : null}
                          <BreadcrumbItem>
                            {isLast || !item.href ? (
                              <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink asChild>
                                <Link href={item.href} prefetch={true}>
                                  {item.label}
                                </Link>
                              </BreadcrumbLink>
                            )}
                          </BreadcrumbItem>
                        </Fragment>
                      );
                    })}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              <div className="hidden items-center gap-2 xl:flex">
                <Badge variant="secondary">/{business.slug}</Badge>
                <Badge variant="outline">{business.defaultCurrency}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <DashboardNotificationBell
                  businessId={business.id}
                  businessSlug={business.slug}
                  initialView={notificationView}
                  key={business.id}
                  userId={user.id}
                />
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col">
          <main className="dashboard-main">
            <div className="dashboard-content">{children}</div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

type DashboardNavigationItemProps = {
  isActive: boolean;
  item: ReturnType<typeof getDashboardNavigation>[number];
};

function DashboardNavigationItem({
  isActive,
  item,
}: DashboardNavigationItemProps) {
  const Icon = item.icon;
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className="min-h-11 rounded-lg border border-transparent px-3.5 py-2.5 data-[active=true]:border-sidebar-primary/12 data-[active=true]:bg-sidebar-primary/12 data-[active=true]:text-sidebar-foreground data-[active=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] dark:data-[active=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        isActive={isActive}
        tooltip={item.label}
      >
        <Link
          href={item.href}
          prefetch={true}
          onClick={() => {
            if (isMobile) {
              setOpenMobile(false);
            }
          }}
        >
          <Icon
            className={cn(
              "text-muted-foreground transition-transform [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease-standard)] group-hover/menu-button:translate-x-0.5 group-data-[active=true]/menu-button:scale-[1.03]",
              isActive && "text-primary",
            )}
          />
          <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function DashboardUserMenu({
  user,
  businessSlug,
}: {
  user: DashboardShellProps["user"];
  businessSlug: string;
}) {
  const [isPending, startTransition] = useTransition();
  const { isMobile, setOpenMobile } = useSidebar();

  function closeMobileSidebar() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  function handleLogout() {
    startTransition(async () => {
      const result = await authClient.signOut();

      if (result.error) {
        return;
      }

      window.location.assign("/login");
    });
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="data-[state=open]:bg-sidebar-accent"
              size="lg"
            >
              <Avatar className="rounded-lg">
                <AvatarFallback className="rounded-lg">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-medium text-sidebar-foreground">
                  {user.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto text-muted-foreground transition-transform [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease-standard)] group-data-[collapsible=icon]:hidden group-data-[state=open]/menu-button:rotate-180" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56 w-56 rounded-xl">
            <DropdownMenuLabel className="px-2 py-2.5">
              <div className="flex items-center gap-3">
                <Avatar className="rounded-lg">
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link
                  href={accountProfilePath}
                  prefetch={true}
                  onClick={closeMobileSidebar}
                >
                  <User data-icon="inline-start" />
                  Your profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={getBusinessSettingsPath(businessSlug)}
                  prefetch={true}
                  onClick={closeMobileSidebar}
                >
                  <Settings2 data-icon="inline-start" />
                  Business settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={businessesHubPath}
                  prefetch={true}
                  onClick={closeMobileSidebar}
                >
                  <PanelsTopLeft data-icon="inline-start" />
                  Manage businesses
                </Link>
              </DropdownMenuItem>
              <AppearanceMenuSubmenu userId={user.id} />
              <DropdownMenuItem asChild>
                <Link
                  href={`/inquire/${businessSlug}`}
                  onClick={closeMobileSidebar}
                  prefetch={false}
                  target="_blank"
                >
                  <ArrowUpRight data-icon="inline-start" />
                  Public inquiry page
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isPending}
              onSelect={(event) => {
                event.preventDefault();
                handleLogout();
              }}
            >
              <LogOut data-icon="inline-start" />
              {isPending ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function BusinessSwitcher({
  currentBusiness,
  memberships,
}: {
  currentBusiness: DashboardShellProps["businessContext"];
  memberships: DashboardShellProps["businessMemberships"];
}) {
  const business = currentBusiness.business;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="group/business-switcher motion-lift w-full rounded-[1.1rem] border border-sidebar-border/90 bg-background/92 p-3.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.42)] transition-[background-color,border-color,box-shadow,transform] [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease-standard)] hover:bg-background data-[state=open]:bg-background data-[state=open]:shadow-[var(--control-shadow-hover)] dark:border-white/8 dark:bg-card/90 dark:shadow-[0_1px_2px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)] dark:hover:bg-accent dark:data-[state=open]:bg-accent"
          type="button"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem] border border-sidebar-border bg-muted/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] dark:border-white/8 dark:bg-accent dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_1px_1px_rgba(0,0,0,0.18)]">
              {business.logoStoragePath ? (
                <Image
                  alt={`${business.name} logo`}
                  className="h-auto max-h-10 w-auto object-contain"
                  height={48}
                  src="/api/business/logo"
                  unoptimized
                  width={48}
                />
              ) : (
                <span className="text-sm font-semibold tracking-[0.16em] text-sidebar-foreground">
                  {getInitials(business.name)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="meta-label text-sidebar-foreground/60">Business</p>
                <ChevronsUpDown className="size-4 text-muted-foreground transition-transform [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease-standard)] group-hover/business-switcher:-translate-y-px group-data-[state=open]/business-switcher:rotate-180" />
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-sidebar-foreground">
                {business.name}
              </p>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                /{business.slug}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge
              className="border-sidebar-border bg-background text-sidebar-foreground"
              variant="outline"
            >
              {business.defaultCurrency}
            </Badge>
            <Badge
              className="bg-sidebar-accent text-sidebar-accent-foreground"
              variant="secondary"
            >
              {business.publicInquiryEnabled ? "Public form live" : "Public form off"}
            </Badge>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 rounded-xl">
        <DropdownMenuLabel className="px-2 py-2.5">
          Switch business
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {memberships.map((membership) => {
            const isCurrent =
              membership.business.id === currentBusiness.business.id;

            return (
              <DropdownMenuItem asChild key={membership.membershipId}>
                <Link
                  href={getBusinessDashboardPath(membership.business.slug)}
                  prefetch={true}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-[0.72rem] font-semibold tracking-[0.14em] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] dark:border-white/8 dark:bg-card dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_1px_1px_rgba(0,0,0,0.18)]">
                    {getInitials(membership.business.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {membership.business.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      /{membership.business.slug}
                    </p>
                  </div>
                  <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {membership.role}
                  </span>
                  {isCurrent ? <Check className="size-4 text-primary" /> : null}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={businessesHubPath} prefetch={true}>
            <PanelsTopLeft data-icon="inline-start" />
            Manage businesses
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join("");
}
