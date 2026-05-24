"use client";

import { useTransition } from "react";
import {
  BriefcaseBusiness,
  Check,
  ChevronsUpDown,
  Lock,
  LogOut,
  PanelsTopLeft,
  Plus,
  Settings2,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";

import { authClient } from "@/lib/auth/client";
import { AppearanceMenuSubmenu } from "@/features/theme/components/appearance-menu";
import { clearPersistedThemePreference } from "@/features/theme/persistence";
import { themeUserStorageKey } from "@/features/theme/types";
import { canManageOperationalBusinessSettings } from "@/lib/business-members";
import type { BusinessContext } from "@/lib/db/business-access";
import { BusinessAvatar } from "@/components/shared/business-avatar";
import { PlanBadge } from "@/components/shared/paywall";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  getBusinessDashboardPath,
  getBusinessMembersPath,
  getBusinessPath,
  getBusinessSettingsPath,
} from "@/features/businesses/routes";
import { getDefaultBusinessSettingsPath } from "@/features/settings/navigation";
import { useBusinessCheckout } from "@/features/billing/components/business-checkout-provider";

/* -------------------------------------------------------------------------- */
/*  Business Switcher                                                          */
/* -------------------------------------------------------------------------- */

export function BusinessSwitcher({
  currentBusiness,
  memberships,
}: {
  currentBusiness: BusinessContext;
  memberships: BusinessContext[];
}) {
  const [isPending, startTransition] = useTransition();
  const { isMobile, setOpenMobile } = useSidebar();
  const businessCheckout = useBusinessCheckout();

  const liveplan =
    businessCheckout?.businessId === currentBusiness.business.id
      ? businessCheckout.currentPlan
      : null;

  const business =
    liveplan && liveplan !== currentBusiness.business.plan
      ? { ...currentBusiness.business, plan: liveplan }
      : currentBusiness.business;

  const shellMemberships = liveplan
    ? memberships.map((membership) =>
        membership.business.id === business.id
          ? { ...membership, business: { ...membership.business, plan: liveplan } }
          : membership,
      )
    : memberships;

  function closeMobileSidebar() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  function handleSignOut() {
    startTransition(async () => {
      const result = await authClient.signOut();
      if (result.error) return;
      window.localStorage.removeItem(themeUserStorageKey);
      clearPersistedThemePreference();
      window.location.assign("/login");
    });
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
            <BusinessAvatar
              name={business.name}
              logoUrl={business.logoStoragePath ? "/api/business/logo" : null}
              className="size-14 rounded-[0.9rem] border-sidebar-border shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] dark:border-white/8 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_1px_1px_rgba(0,0,0,0.18)] [&_[data-slot=avatar-image]]:rounded-[0.9rem] [&_[data-slot=avatar-fallback]]:rounded-[0.9rem] [&_[data-slot=avatar-fallback]]:text-sm [&_[data-slot=avatar-fallback]]:tracking-[0.16em] [&_[data-slot=avatar-fallback]]:text-sidebar-foreground"
            />
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
            <PlanBadge plan={business.plan} />
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
          {shellMemberships.map((membership) => {
            const isCurrent =
              membership.business.id === currentBusiness.business.id;

            return (
              <DropdownMenuItem asChild key={membership.membershipId}>
                <Link
                  href={getBusinessDashboardPath(membership.business.slug)}
                  prefetch={true}
                  onClick={closeMobileSidebar}
                >
                  <BusinessAvatar
                    name={membership.business.name}
                    logoUrl={membership.business.logoStoragePath ? `/api/business/${membership.business.slug}/logo` : null}
                  />
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
                  {membership.business.recordState === "locked" ? (
                    <Badge variant="outline" className="gap-1">
                      <Lock className="size-3" />
                      Locked
                    </Badge>
                  ) : null}
                  {isCurrent ? <Check className="size-4 text-primary" /> : null}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link
              href="/new"
              onClick={closeMobileSidebar}
              prefetch={true}
            >
              <Plus data-icon="inline-start" />
              New business
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link
              href={getBusinessSettingsPath(business.slug, "general")}
              prefetch={true}
              onClick={closeMobileSidebar}
            >
              <Settings2 data-icon="inline-start" />
              Business settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={getBusinessSettingsPath(business.slug, "profile")}
              prefetch={true}
              onClick={closeMobileSidebar}
            >
              <User data-icon="inline-start" />
              Account settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={getBusinessMembersPath(business.slug)}
              prefetch={true}
              onClick={closeMobileSidebar}
            >
              <Users data-icon="inline-start" />
              Invite team members
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isPending}
          onSelect={(event) => {
            event.preventDefault();
            handleSignOut();
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
  );
}

/* -------------------------------------------------------------------------- */
/*  User Menu                                                                  */
/* -------------------------------------------------------------------------- */

export function DashboardUserMenu({
  user,
  businessRole,
  businessSlug,
  plan,
}: {
  user: {
    id: string;
    email: string;
    name: string;
    avatarSrc: string | null;
  };
  businessRole: BusinessContext["role"];
  businessSlug: string;
  plan: BusinessContext["business"]["plan"];
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
                  <AvatarImage alt={`${user.name} avatar`} src={user.avatarSrc} loading="eager" decoding="async" fetchPriority="high" />
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
              <ChevronsUpDown className="ml-auto text-muted-foreground transition-transform [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease-standard)] group-data-[state=open]/menu-button:rotate-180" />
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
                    <AvatarImage alt={`${user.name} avatar`} src={user.avatarSrc} loading="eager" decoding="async" fetchPriority="high" />
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
                  href={getBusinessSettingsPath(businessSlug, "profile")}
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
                  href={getBusinessSettingsPath(businessSlug, "billing")}
                  prefetch={true}
                  onClick={closeMobileSidebar}
                >
                  <BriefcaseBusiness data-icon="inline-start" />
                  Billing
                  <PlanBadge plan={plan} className="ml-auto" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={getBusinessPath(businessSlug)}
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

/* -------------------------------------------------------------------------- */
/*  Skeleton fallbacks for streamed slots                                      */
/* -------------------------------------------------------------------------- */

export { BusinessSwitcherSkeleton, UserMenuSkeleton };

function BusinessSwitcherSkeleton() {
  return (
    <div className="w-full rounded-[1.1rem] border border-sidebar-border/90 bg-background/92 p-3.5 dark:border-white/8 dark:bg-card/90">
      <div className="flex items-start gap-3.5">
        <div className="size-14 shrink-0 animate-pulse rounded-[0.9rem] bg-muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-14 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-28 animate-pulse rounded-md bg-muted" />
          <div className="h-3.5 w-20 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-10 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2">
      <div className="size-9 animate-pulse rounded-lg bg-muted" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3.5 w-24 animate-pulse rounded-md bg-muted" />
        <div className="h-3 w-36 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
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
