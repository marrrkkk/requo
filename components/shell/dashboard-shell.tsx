"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useTransition } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronsUpDown,
  LogOut,
  PanelsTopLeft,
  Settings2,
} from "lucide-react";
import { usePathname } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import type { WorkspaceContext } from "@/lib/db/workspace-access";
import { BrandMark } from "@/components/shared/brand-mark";
import {
  getActiveDashboardNavigationItem,
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
  getWorkspaceDashboardPath,
  getWorkspaceSettingsPath,
  workspaceHubPath,
} from "@/features/workspaces/routes";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  children: ReactNode;
  user: {
    email: string;
    name: string;
  };
  workspaceContext: WorkspaceContext;
  workspaceMemberships: WorkspaceContext[];
};

export function DashboardShell({
  children,
  user,
  workspaceContext,
  workspaceMemberships,
}: DashboardShellProps) {
  const pathname = usePathname();
  const activeItem = getActiveDashboardNavigationItem(pathname);
  const dashboardNavigation = getDashboardNavigation(workspaceContext.workspace.slug);
  const workspace = workspaceContext.workspace;

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
            <WorkspaceSwitcher
              currentWorkspace={workspaceContext}
              memberships={workspaceMemberships}
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
          <DashboardUserMenu user={user} workspaceSlug={workspace.slug} />
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
                    <BreadcrumbItem className="hidden sm:block">
                      <BreadcrumbLink asChild>
                        <Link
                          href={getWorkspaceDashboardPath(workspace.slug)}
                          prefetch={false}
                        >
                          Dashboard
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden sm:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{activeItem?.label ?? "Overview"}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              <div className="hidden items-center gap-2 xl:flex">
                <Badge variant="secondary">/{workspace.slug}</Badge>
                <Badge variant="outline">{workspace.defaultCurrency}</Badge>
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
        className="min-h-11 rounded-lg border border-transparent px-3.5 py-2.5 data-[active=true]:border-sidebar-primary/12 data-[active=true]:bg-sidebar-primary/12 data-[active=true]:text-sidebar-foreground data-[active=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
        isActive={isActive}
        tooltip={item.label}
      >
        <Link
          href={item.href}
          onClick={() => {
            if (isMobile) {
              setOpenMobile(false);
            }
          }}
          prefetch={false}
        >
          <Icon className={cn("text-muted-foreground", isActive && "text-primary")} />
          <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function DashboardUserMenu({
  user,
  workspaceSlug,
}: {
  user: DashboardShellProps["user"];
  workspaceSlug: string;
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
              <ChevronsUpDown className="ml-auto text-muted-foreground group-data-[collapsible=icon]:hidden" />
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
                  href={getWorkspaceSettingsPath(workspaceSlug)}
                  onClick={closeMobileSidebar}
                  prefetch={false}
                >
                  <Settings2 data-icon="inline-start" />
                  Workspace settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={workspaceHubPath}
                  onClick={closeMobileSidebar}
                  prefetch={false}
                >
                  <PanelsTopLeft data-icon="inline-start" />
                  Manage workspaces
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/inquire/${workspaceSlug}`}
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

function WorkspaceSwitcher({
  currentWorkspace,
  memberships,
}: {
  currentWorkspace: DashboardShellProps["workspaceContext"];
  memberships: DashboardShellProps["workspaceMemberships"];
}) {
  const workspace = currentWorkspace.workspace;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="w-full rounded-[1.1rem] border border-sidebar-border/90 bg-background/92 p-3.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.42)] transition-colors hover:bg-background"
          type="button"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem] border border-sidebar-border bg-muted/55">
              {workspace.logoStoragePath ? (
                <Image
                  alt={`${workspace.name} logo`}
                  className="h-auto max-h-10 w-auto object-contain"
                  height={48}
                  src="/api/workspace/logo"
                  unoptimized
                  width={48}
                />
              ) : (
                <span className="text-sm font-semibold tracking-[0.16em] text-sidebar-foreground">
                  {getInitials(workspace.name)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="meta-label text-sidebar-foreground/60">Workspace</p>
                <ChevronsUpDown className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-sidebar-foreground">
                {workspace.name}
              </p>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                /{workspace.slug}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge
              className="border-sidebar-border bg-background text-sidebar-foreground"
              variant="outline"
            >
              {workspace.defaultCurrency}
            </Badge>
            <Badge
              className="bg-sidebar-accent text-sidebar-accent-foreground"
              variant="secondary"
            >
              {workspace.publicInquiryEnabled ? "Public form live" : "Public form off"}
            </Badge>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 rounded-xl">
        <DropdownMenuLabel className="px-2 py-2.5">
          Switch workspace
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {memberships.map((membership) => {
            const isCurrent =
              membership.workspace.id === currentWorkspace.workspace.id;

            return (
              <DropdownMenuItem asChild key={membership.membershipId}>
                <Link
                  href={getWorkspaceDashboardPath(membership.workspace.slug)}
                  prefetch={false}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-[0.72rem] font-semibold tracking-[0.14em] text-foreground">
                    {getInitials(membership.workspace.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {membership.workspace.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      /{membership.workspace.slug}
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
          <Link href={workspaceHubPath} prefetch={false}>
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
