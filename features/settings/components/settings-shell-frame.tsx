"use client";

import Link from "next/link";
import { memo, type CSSProperties, type ReactNode, useTransition } from "react";
import {
  ArrowLeft,
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
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { authClient } from "@/lib/auth/client";
import { AppearanceMenuSubmenu } from "@/features/theme/components/appearance-menu";
import { clearPersistedThemePreference } from "@/features/theme/persistence";
import { themeUserStorageKey } from "@/features/theme/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandMark } from "@/components/shared/brand-mark";
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
import { Spinner } from "@/components/ui/spinner";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import type { SettingsNavigationGroup } from "@/features/settings/navigation";
import { cn } from "@/lib/utils";

const settingsIcons: Record<string, LucideIcon> = {
  user: User,
  palette: Palette,
  bell: Bell,
  building: Building2,
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
  businessNameSlot: ReactNode;
};

/**
 * Settings shell frame matching the business dashboard sidebar pattern.
 * Uses the same shadcn Sidebar components but shows settings navigation
 * instead of the business navigation, and omits the business switcher.
 */
export function SettingsShellFrame({
  children,
  businessSlug,
  groups,
  user,
  userMenuSlot,
  businessNameSlot,
}: SettingsShellFrameProps) {
  const businessDashboardPath = getBusinessDashboardPath(businessSlug);

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
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="gap-0 px-0 py-0">
          <div className="flex h-12 items-center justify-between border-b border-border/70 px-3">
            <BrandMark
              collapseLabel
              className="min-w-0 px-2 py-1.5"
              subtitle="Settings"
              href={businessDashboardPath}
            />
            <SidebarTrigger className="size-7 shrink-0" />
          </div>
          <div className="flex items-center gap-2.5 px-5 py-3">
            {businessNameSlot}
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0 px-1 pb-3">
          {groups.map((group) => (
            <SidebarGroup key={group.label} className="px-3 pt-4">
              <span className="meta-label px-3 pb-1.5 text-xs text-muted-foreground">
                {group.label}
              </span>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SettingsNavigationItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={settingsIcons[item.icon] ?? User}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarSeparator />

        <SidebarFooter className="p-3 pt-2">
          {userMenuSlot ?? (user ? <SettingsUserMenu user={user} businessSlug={businessSlug} /> : null)}
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-svh min-w-0">
        <header className="dashboard-topbar flex h-12 items-center">
          <DesktopSidebarTrigger />
          <div className="dashboard-topbar-inner min-w-0 flex-1">
            <div className="flex min-h-9 min-w-0 items-center gap-2 md:gap-2.5">
              <SidebarTrigger className="size-8 shrink-0 lg:hidden" />
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
                className="hidden h-3.5 w-px shrink-0 self-center bg-border md:block"
              />
              <p className="hidden text-sm font-medium text-foreground md:block">
                Settings
              </p>
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col">
          <main className="dashboard-main">
            <div className="dashboard-content dashboard-page">{children}</div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Internal components                                                        */
/* -------------------------------------------------------------------------- */

function DesktopSidebarTrigger() {
  const { state } = useSidebar();

  if (state === "expanded") {
    return null;
  }

  return (
    <div className="hidden items-center pl-3 lg:flex">
      <SidebarTrigger className="size-8 shrink-0" />
    </div>
  );
}

type SettingsNavigationItemProps = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const SettingsNavigationItem = memo(function SettingsNavigationItem({
  href,
  label,
  icon: Icon,
}: SettingsNavigationItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  const { isMobile, setOpenMobile } = useSidebar();

  function handleClick() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className="min-h-10 rounded-lg border border-transparent px-3 py-2 data-[active=true]:border-sidebar-primary/12 data-[active=true]:bg-sidebar-primary/12 data-[active=true]:text-primary data-[active=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] dark:data-[active=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        isActive={isActive}
        tooltip={label}
      >
        <Link href={href} prefetch={true} onClick={handleClick}>
          <Icon
            className={cn(
              "text-muted-foreground transition-transform [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease-standard)]",
              isActive && "text-primary",
            )}
          />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
});

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
              className="data-[state=open]:bg-sidebar-accent"
              size="lg"
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
              <div className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium text-sidebar-foreground">
                  {user.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto text-muted-foreground" />
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
