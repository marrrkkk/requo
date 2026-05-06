"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";

import {
  Fragment,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useTransition } from "react";
import {
  BriefcaseBusiness,
  Check,
  ChevronsUpDown,
  LogOut,
  PanelsTopLeft,
  Settings2,
  User,
} from "lucide-react";
import { usePathname } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import { getAccountProfilePath } from "@/features/account/routes";
import { AppearanceMenuSubmenu } from "@/features/theme/components/appearance-menu";

import { ThemePreferenceSync } from "@/features/theme/components/theme-preference-sync";
import { clearPersistedThemePreference } from "@/features/theme/persistence";
import {
  themeUserStorageKey,
  type ThemePreference,
} from "@/features/theme/types";
import { canManageOperationalBusinessSettings } from "@/lib/business-members";
import type { BusinessContext } from "@/lib/db/business-access";
import { BrandMark } from "@/components/shared/brand-mark";
import { PlanBadge } from "@/components/shared/paywall";
import {
  getDashboardBreadcrumbs,
  getDashboardNavigation,
  isDashboardNavigationItemActive,
} from "@/components/shell/dashboard-navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Spinner } from "@/components/ui/spinner";
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
} from "@/features/businesses/routes";
import { useWorkspaceCheckout } from "@/features/billing/components/workspace-checkout-provider";
import {
  workspacesHubPath,
  getWorkspacePath,
  getWorkspaceSettingsPath,
} from "@/features/workspaces/routes";
import { getDefaultBusinessSettingsPath } from "@/features/settings/navigation";
import { cn } from "@/lib/utils";

const CommandMenu = dynamic(
  () =>
    import("@/components/shell/command-menu").then(
      (module) => module.CommandMenu,
    ),
  {
    loading: () => (
      <div className="hidden h-9 w-64 rounded-lg border border-border/60 bg-muted/20 md:block lg:w-80" />
    ),
  },
);

const DashboardAiPanel = dynamic(
  () =>
    import("@/features/ai/components/dashboard-ai-panel").then(
      (module) => module.DashboardAiPanel,
    ),
  {
    loading: () => null,
  },
);

type DashboardShellProps = {
  children: ReactNode;
  themePreference: ThemePreference;
  user: {
    id: string;
    email: string;
    name: string;
    avatarSrc: string | null;
  };
  businessContext: BusinessContext;
  businessMemberships: BusinessContext[];
  /** Pre-rendered notification bell, typically Suspense-wrapped for streaming. */
  notificationSlot: ReactNode;
  /** Pre-rendered upgrade button, typically Suspense-wrapped for streaming. */
  upgradeSlot: ReactNode;
};

export function DashboardShell({
  children,
  themePreference,
  user,
  businessContext,
  businessMemberships,
  notificationSlot,
  upgradeSlot,
}: DashboardShellProps) {
  const pathname = usePathname();
  const workspaceCheckout = useWorkspaceCheckout();
  const liveWorkspacePlan =
    workspaceCheckout?.workspaceId === businessContext.business.workspaceId
      ? workspaceCheckout.currentPlan
      : null;
  const business =
    liveWorkspacePlan &&
    liveWorkspacePlan !== businessContext.business.workspacePlan
      ? {
          ...businessContext.business,
          workspacePlan: liveWorkspacePlan,
        }
      : businessContext.business;
  const shellBusinessContext =
    business === businessContext.business
      ? businessContext
      : {
          ...businessContext,
          business,
        };
  const shellBusinessMemberships = liveWorkspacePlan
    ? businessMemberships.map((membership) =>
        membership.business.workspaceId === business.workspaceId
          ? {
              ...membership,
              business: {
                ...membership.business,
                workspacePlan: liveWorkspacePlan,
              },
            }
          : membership,
      )
    : businessMemberships;
  const breadcrumbs = getDashboardBreadcrumbs(pathname);
  const dashboardNavigation = getDashboardNavigation(
    business.slug,
    businessContext.role,
  );
  const currentPageLabel = breadcrumbs.at(-1)?.label ?? business.name;

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
              href={getBusinessDashboardPath(business.slug)}
            />
          </div>
          <SidebarSeparator />
          <div className="px-3 py-3 group-data-[collapsible=icon]:hidden">
            <BusinessSwitcher
              currentBusiness={shellBusinessContext}
              memberships={shellBusinessMemberships}
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
          <DashboardUserMenu
            user={user}
            businessRole={businessContext.role}
            businessSlug={business.slug}
            workspaceSlug={business.workspaceSlug}
            workspacePlan={business.workspacePlan}
          />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-svh min-w-0">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-inner">
            <div className="flex min-h-11 min-w-0 items-center gap-2.5 md:gap-3">
              <SidebarTrigger className="size-10 shrink-0" />
              <span
                aria-hidden="true"
                className="hidden h-4 w-px shrink-0 self-center bg-border md:block"
              />
              <div className="min-w-0 flex-1 md:hidden">
                <p className="truncate font-heading text-base font-semibold tracking-tight text-foreground">
                  {currentPageLabel}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {business.name}
                </p>
              </div>
              <div className="hidden min-w-0 flex-1 md:block">
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
              <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 md:min-w-0 md:flex-initial md:justify-start">
                <div className="hidden md:block">
                  <CommandMenu
                    businessSlug={business.slug}
                    role={businessContext.role}
                    workspacePlan={business.workspacePlan}
                    workspaceSlug={business.workspaceSlug}
                  />
                </div>
                <div className="hidden min-[390px]:contents sm:contents">
                  {upgradeSlot}
                </div>
                {notificationSlot}
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col">
          <main className="dashboard-main">
            <div className="dashboard-content">{children}</div>
          </main>
        </div>
        <DashboardAiPanel
          businessId={business.id}
          businessSlug={business.slug}
          userName={user.name || "You"}
          workspacePlan={business.workspacePlan}
        />
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
    <SidebarMenuItem
      data-tour={`nav-${item.label.toLowerCase().replace(/[\s-]+/g, "-")}`}
    >
      <SidebarMenuButton
        asChild
        className="min-h-10 rounded-lg border border-transparent px-3 py-2 data-[active=true]:border-sidebar-primary/12 data-[active=true]:bg-sidebar-primary/12 data-[active=true]:text-primary data-[active=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] dark:data-[active=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
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
              "text-muted-foreground transition-transform [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease-standard)]",
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
  businessRole,
  businessSlug,
  workspaceSlug,
  workspacePlan,
}: {
  user: DashboardShellProps["user"];
  businessRole: DashboardShellProps["businessContext"]["role"];
  businessSlug: string;
  workspaceSlug: string;
  workspacePlan: BusinessContext["business"]["workspacePlan"];
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

      window.localStorage.removeItem(themeUserStorageKey);
      clearPersistedThemePreference();

      window.location.assign("/login");
    });
  }

  const canOpenBusinessSettings =
    canManageOperationalBusinessSettings(businessRole);
  const businessSettingsHref = getDefaultBusinessSettingsPath(
    businessSlug,
    businessRole,
  );

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
                {user.avatarSrc ? (
                  <AvatarImage alt={`${user.name} avatar`} src={user.avatarSrc} />
                ) : null}
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
          <DropdownMenuContent
            align="end"
            className="w-[min(16rem,calc(100vw-2rem))] rounded-xl"
          >
            <DropdownMenuLabel className="px-2 py-2.5">
              <div className="flex items-center gap-3">
                <Avatar className="rounded-lg">
                  {user.avatarSrc ? (
                    <AvatarImage alt={`${user.name} avatar`} src={user.avatarSrc} />
                  ) : null}
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
                  href={getAccountProfilePath()}
                  prefetch={true}
                  onClick={closeMobileSidebar}
                >
                  <User data-icon="inline-start" />
                  User settings
                </Link>
              </DropdownMenuItem>
              {canOpenBusinessSettings ? (
                <DropdownMenuItem asChild>
                  <Link
                    href={businessSettingsHref}
                    prefetch={true}
                    onClick={closeMobileSidebar}
                  >
                    <Settings2 data-icon="inline-start" />
                    Business settings
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild>
                <Link
                  href={getWorkspaceSettingsPath(workspaceSlug, "billing")}
                  prefetch={true}
                  onClick={closeMobileSidebar}
                >
                  <BriefcaseBusiness data-icon="inline-start" />
                  Billing
                  <PlanBadge plan={workspacePlan} showIcon={false} className="ml-auto" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={getWorkspacePath(workspaceSlug)}
                  prefetch={true}
                  onClick={closeMobileSidebar}
                >
                  <PanelsTopLeft data-icon="inline-start" />
                  Manage businesses
                </Link>
              </DropdownMenuItem>
              <AppearanceMenuSubmenu userId={user.id} />
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isPending}
              onSelect={(event) => {
                event.preventDefault();
                handleLogout();
              }}
            >
              {isPending ? (
                <>
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut data-icon="inline-start" />
                  Sign out
                </>
              )}
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
  const { isMobile, setOpenMobile } = useSidebar();
  const business = currentBusiness.business;

  function closeMobileSidebar() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="group/business-switcher w-full rounded-[1.1rem] border border-sidebar-border/90 bg-background/92 p-3.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.42)] transition-[background-color,border-color,box-shadow,transform] [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease-standard)] hover:bg-background data-[state=open]:bg-background data-[state=open]:shadow-[var(--control-shadow-hover)] dark:border-white/8 dark:bg-card/90 dark:shadow-[0_1px_2px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)] dark:hover:bg-accent dark:data-[state=open]:bg-accent"
          data-tour="business-switcher"
          type="button"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem] border border-sidebar-border bg-muted/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] dark:border-white/8 dark:bg-accent dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_1px_1px_rgba(0,0,0,0.18)]">
              {business.logoStoragePath ? (
                <Image
                  alt={`${business.name} logo`}
                  className="h-full w-full object-cover"
                  height={56}
                  src="/api/business/logo"
                  unoptimized
                  width={56}
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
                <ChevronsUpDown className="size-4 text-muted-foreground transition-transform [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease-standard)] group-data-[state=open]/business-switcher:rotate-180" />
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
            <PlanBadge plan={business.workspacePlan} showIcon={true} />
            <Badge
              className="border-sidebar-border bg-background text-sidebar-foreground"
              variant="outline"
            >
              {business.defaultCurrency}
            </Badge>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[min(18rem,calc(100vw-2rem))] rounded-xl"
      >
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
                  onClick={closeMobileSidebar}
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
          <Link
            href={workspacesHubPath}
            onClick={closeMobileSidebar}
            prefetch={true}
          >
            <PanelsTopLeft data-icon="inline-start" />
            Manage workspaces
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
