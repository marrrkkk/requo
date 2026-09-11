"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useMemo, useTransition } from "react";
import {
  ArrowLeft,
  Astroid,
  Bell,
  BookOpen,
  Building2,
  ChevronsUpDown,
  FileText,
  Home as HomeIcon,
  LifeBuoy,
  LogOut,
  Mail,
  Palette,
  Receipt,
  ScrollText,
  Tag,
  User,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { authClient } from "@/lib/auth/client";
import { AppearanceMenuSubmenu } from "@/features/theme/components/appearance-menu";
import { clearPersistedThemePreference } from "@/features/theme/persistence";
import { themeUserStorageKey } from "@/features/theme/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { BoarduiSettingsSidebar } from "@/features/settings/components/boardui-settings-sidebar";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import {
  Breadcrumb,
  BreadcrumbItem,
} from "@/components/base/breadcrumb/breadcrumb";
import { getDashboardBreadcrumbs } from "@/components/shell/dashboard-navigation";
import { MobileSettingsBottomNav } from "@/components/shell/mobile-settings-bottom-nav";
import { MobileTopBar } from "@/components/shell/mobile-top-bar";
import type { SettingsNavigationGroup } from "@/features/settings/navigation";

export const settingsIcons: Record<string, LucideIcon> = {
  user: User,
  palette: Palette,
  bell: Bell,
  building: Building2,
  astroid: Astroid,
  users: Users,
  receipt: Receipt,
  "file-text": FileText,
  mail: Mail,
  tag: Tag,
  book: BookOpen,
  "life-buoy": LifeBuoy,
  scroll: ScrollText,
};

export type SettingsUserData = {
  id: string;
  name: string;
  email: string;
  avatarSrc: string | null;
};

export type SettingsShellFrameProps = {
  children: ReactNode;
  businessSlug: string;
  groups: SettingsNavigationGroup[];
  user?: SettingsUserData;
  userMenuSlot?: ReactNode;
  /** Streamed business switcher slot (same compact switcher as the main sidebar). */
  businessSwitcherSlot: ReactNode;
  /** Streamed mobile top bar business switcher slot. */
  mobileBusinessSwitcherSlot?: ReactNode;
  /** Streamed mobile top bar user menu slot. */
  mobileUserMenuSlot?: ReactNode;
};

/**
 * Settings shell frame using the BoardUI Sidebar.
 *
 * `BoarduiSettingsSidebar` maps the grouped settings navigation onto
 * BoardUI's `DashboardSidebar` (`groups` + `selected`) inside a
 * `flex min-h-screen bg-background-full` layout, following the docs usage
 * example. The business switcher streams in as the top slot (same compact
 * switcher as the main sidebar); the user menu streams in as the bottom
 * slot. Help & Support lives in the Other navigation group.
 *
 * `SidebarProvider` is kept (without shadcn `Sidebar` chrome) because the
 * streamed business switcher / user menu slots consume its sidebar context
 * (`useSidebar` for mobile-drawer dismissal).
 */
export function SettingsShellFrame({
  children,
  businessSlug,
  groups,
  user,
  userMenuSlot,
  businessSwitcherSlot,
  mobileBusinessSwitcherSlot,
  mobileUserMenuSlot,
}: SettingsShellFrameProps) {
  const businessDashboardPath = getBusinessDashboardPath(businessSlug);
  const pathname = usePathname();
  const breadcrumbs = useMemo(
    () => getDashboardBreadcrumbs(pathname),
    [pathname],
  );
  const currentSectionLabel = breadcrumbs.at(-1)?.label ?? "Settings";

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-svh flex-1 bg-background-full">
        {/* Desktop sidebar — BoardUI panel flush to the left screen edge (hidden below lg; mobile uses the top/bottom bars). */}
        <div className="sticky top-0 hidden h-svh shrink-0 lg:block">
          <BoarduiSettingsSidebar
            businessSlug={businessSlug}
            groups={groups}
            topSlot={businessSwitcherSlot}
            bottomSlot={
              userMenuSlot ??
              (user ? (
                <SettingsUserMenu user={user} businessSlug={businessSlug} />
              ) : null)
            }
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top app bar (below lg) */}
          <MobileTopBar
            businessControl={mobileBusinessSwitcherSlot}
            pageTitle={currentSectionLabel}
            userControl={mobileUserMenuSlot}
          />

          {/* Desktop topbar (lg and above) */}
          <div className="sticky top-0 z-30 hidden h-12 items-stretch bg-background lg:flex">
            <header className="flex min-w-0 flex-1 items-center">
              <div className="dashboard-topbar-inner min-w-0 flex-1">
                <div className="flex min-h-9 min-w-0 items-center gap-2 md:gap-2.5">
                  <Button
                    asChild
                    variant="ghost"
                    size="icon-sm"
                    className="hidden size-8 shrink-0 lg:inline-flex"
                  >
                    <Link href={businessDashboardPath} aria-label="Home">
                      <HomeIcon className="size-4" />
                    </Link>
                  </Button>
                  <span
                    aria-hidden="true"
                    className="hidden h-3.5 w-px shrink-0 self-center bg-border lg:block"
                  />
                  <div className="min-w-0 flex-1">
                    <Breadcrumb aria-label="Pages">
                      {breadcrumbs.map((item, index) => {
                        const isLast = index === breadcrumbs.length - 1;

                        if (isLast || !item.href) {
                          return (
                            <BreadcrumbItem
                              key={`${item.label}-${item.href ?? index}`}
                              current
                              className="text-sm font-normal text-foreground"
                            >
                              {item.label}
                            </BreadcrumbItem>
                          );
                        }

                        return (
                          <BreadcrumbItem
                            key={`${item.label}-${item.href ?? index}`}
                            href={item.href}
                            className="text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
                          >
                            {item.label}
                          </BreadcrumbItem>
                        );
                      })}
                    </Breadcrumb>
                  </div>
                </div>
              </div>
            </header>
          </div>

          <div className="flex flex-1 flex-col pb-20 lg:pb-0">
            <main className="dashboard-main">
              <div className="dashboard-content dashboard-page">{children}</div>
            </main>
          </div>

          <MobileSettingsBottomNav
            businessSlug={businessSlug}
            groups={groups}
            userMenuSlot={userMenuSlot ?? (user ? <SettingsUserMenu user={user} businessSlug={businessSlug} /> : null)}
          />
        </div>
      </div>
    </SidebarProvider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Internal components                                                        */
/* -------------------------------------------------------------------------- */

export function SettingsUserMenu({ user, businessSlug }: { user: SettingsUserData; businessSlug: string }) {
  const [isPending, startTransition] = useTransition();
  const { isMobile, setOpenMobile } = useSidebar();
  const businessDashboardPath = getBusinessDashboardPath(businessSlug);

  function closeMobileSidebar() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  function handleLogout() {
    startTransition(async () => {
      const result = await authClient.signOut();
      if (result.error) return;
      window.localStorage.removeItem(themeUserStorageKey);
      clearPersistedThemePreference();
      window.location.assign("/login");
    });
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="cursor-pointer group-data-[collapsed=true]/sidebar:h-9 group-data-[collapsed=true]/sidebar:w-9 group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:gap-0 group-data-[collapsed=true]/sidebar:rounded-full group-data-[collapsed=true]/sidebar:p-0 data-[state=open]:bg-sidebar-accent"
              size="lg"
              tooltip={user.name}
            >
              <Avatar className="size-8 rounded-lg">
                {user.avatarSrc ? (
                  <AvatarImage
                    alt={`${user.name} avatar`}
                    src={user.avatarSrc}
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                  />
                ) : null}
                <AvatarFallback className="rounded-lg">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsed=true]/sidebar:hidden group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-medium text-sidebar-foreground">
                  {user.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto text-muted-foreground group-data-[collapsed=true]/sidebar:hidden group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[min(16rem,calc(100vw-2rem))] rounded-xl"
            side="top"
          >
            <DropdownMenuLabel className="px-2 py-2.5">
              <div className="flex items-center gap-3">
                <Avatar className="size-8 rounded-lg">
                  {user.avatarSrc ? (
                    <AvatarImage
                      alt={`${user.name} avatar`}
                      src={user.avatarSrc}
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                    />
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
                  href={businessDashboardPath}
                  prefetch={true}
                  onClick={closeMobileSidebar}
                >
                  <ArrowLeft data-icon="inline-start" />
                  Back to business
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

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join("");
}
