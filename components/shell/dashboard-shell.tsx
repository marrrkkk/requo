"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useTransition } from "react";
import {
  ArrowUpRight,
  ChevronsUpDown,
  LogOut,
  Settings2,
} from "lucide-react";
import { usePathname } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import { BrandMark } from "@/components/shared/brand-mark";
import {
  dashboardNavigation,
  getActiveDashboardNavigationItem,
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
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
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

const primaryNavigation = dashboardNavigation.filter(
  (item) => item.href !== "/dashboard/settings",
);
const secondaryNavigation = dashboardNavigation.filter(
  (item) => item.href === "/dashboard/settings",
);

export function DashboardShell({
  children,
  user,
  workspaceContext,
}: DashboardShellProps) {
  const pathname = usePathname();
  const activeItem = getActiveDashboardNavigationItem(pathname);
  const workspace = workspaceContext.workspace;
  const membershipLabel = workspaceContext.role === "owner" ? "Owner" : "Member";

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
          <div className="flex h-16 items-center px-3">
            <BrandMark
              collapseLabel
              className="min-w-0 px-2 py-1.5"
              subtitle={null}
            />
          </div>
          <SidebarSeparator />
          <div className="px-4 py-4 group-data-[collapsible=icon]:hidden">
            <div className="flex items-start gap-3">
              <Avatar
                className="rounded-xl border-sidebar-border bg-background"
                size="lg"
              >
                <AvatarFallback className="rounded-xl bg-muted text-sidebar-foreground">
                  {getInitials(workspace.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="meta-label text-sidebar-foreground/60">
                  {membershipLabel}
                </p>
                <p className="mt-2 truncate text-sm font-semibold text-sidebar-foreground">
                  {workspace.name}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  /{workspace.slug}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
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
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-3 pb-2">
          <SidebarGroup className="pt-3">
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarMenu>
              {primaryNavigation.map((item) => (
                <DashboardNavigationItem
                  isActive={isDashboardNavigationItemActive(pathname, item.href)}
                  item={item}
                  key={item.href}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup className="pt-0">
            <SidebarGroupLabel>Configuration</SidebarGroupLabel>
            <SidebarMenu>
              {secondaryNavigation.map((item) => (
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

        <SidebarFooter className="p-2 pt-1">
          <DashboardUserMenu user={user} workspaceSlug={workspace.slug} />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-svh min-w-0">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-inner">
            <div className="flex min-h-11 min-w-0 flex-wrap items-center gap-3 md:flex-nowrap">
              <SidebarTrigger className="shrink-0" />
              <Separator
                className="hidden data-[orientation=vertical]:h-4 md:block"
                orientation="vertical"
              />
              <div className="min-w-0 flex-1">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden sm:block">
                      <BreadcrumbLink asChild>
                        <Link href="/dashboard">Dashboard</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden sm:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{activeItem.label}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <p className="mt-1 hidden truncate text-xs text-muted-foreground md:block">
                  {activeItem.description}
                </p>
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
  item: (typeof dashboardNavigation)[number];
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
        className="data-[active=true]:bg-sidebar-primary/10 data-[active=true]:text-sidebar-foreground data-[active=true]:shadow-none"
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
          <span>{item.label}</span>
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
                  href="/dashboard/settings"
                  onClick={closeMobileSidebar}
                  prefetch={false}
                >
                  <Settings2 data-icon="inline-start" />
                  Settings
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

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join("");
}
