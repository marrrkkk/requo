"use client";

import { Shield, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import type {
  AccountSettingsNavigationGroup,
  AccountSettingsNavigationIcon,
} from "@/features/account/navigation";
import { useProgressRouter } from "@/hooks/use-progress-router";
import {
  Combobox,
  type ComboboxOptionGroup,
} from "@/components/ui/combobox";
import { BusinessSettingsNavLink } from "@/features/settings/components/business-settings-nav-link";

type AccountSettingsNavProps = {
  groups: AccountSettingsNavigationGroup[];
};

type AccountSettingsOption = {
  icon: AccountSettingsNavigationIcon;
  label: string;
  searchText: string;
  value: string;
};

const navigationIcons: Record<
  AccountSettingsNavigationIcon,
  typeof User
> = {
  profile: User,
  security: Shield,
};

function isActiveAccountSettingsItem(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AccountSettingsNav({ groups }: AccountSettingsNavProps) {
  const pathname = usePathname();
  const router = useProgressRouter();
  const flatItems = groups.flatMap((group) => group.items);
  const activeItem = flatItems.find((item) =>
    isActiveAccountSettingsItem(pathname, item.href),
  );
  const comboboxGroups: ComboboxOptionGroup<AccountSettingsOption>[] = groups.map(
    (group) => ({
      heading: group.label,
      options: group.items.map((item) => ({
        icon: item.icon,
        label: item.label,
        searchText: `${group.label} ${item.label}`,
        value: item.href,
      })),
    }),
  );

  useEffect(() => {
    for (const item of flatItems) {
      router.prefetch(item.href);
    }
  }, [flatItems, router]);

  if (!flatItems.length) {
    return null;
  }

  return (
    <div className="min-w-0 xl:w-60 xl:justify-self-start xl:max-h-[calc(100svh-10rem)] xl:overflow-y-auto xl:overscroll-y-contain xl:-mr-2 xl:pr-2 xl:pb-12 hover-scrollbar">
      <div className="px-1 pb-1 xl:hidden">
        <div className="flex flex-col gap-2">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            User settings
          </p>
          <Combobox
            groups={comboboxGroups}
            id="account-settings-section"
            onValueChange={(value) => {
              if (isActiveAccountSettingsItem(pathname, value)) {
                return;
              }

              router.push(value);
            }}
            placeholder="Choose a user settings section"
            renderOption={(option) => {
              const Icon = navigationIcons[option.icon];

              return (
                <span className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  <span>{option.label}</span>
                </span>
              );
            }}
            renderValue={(option) => {
              const Icon = navigationIcons[option.icon];

              return (
                <span className="flex min-w-0 items-center gap-2 text-left">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{option.label}</span>
                </span>
              );
            }}
            searchPlaceholder="Search user settings"
            value={activeItem?.href ?? ""}
          />
        </div>
      </div>

      <aside className="hidden xl:block">
        <nav className="flex flex-col gap-3 pr-3">
          {groups.map((group) => (
            <div className="flex flex-col gap-0.5" key={group.label}>
              <p className="px-2.5 pb-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = navigationIcons[item.icon];

                  return (
                    <BusinessSettingsNavLink
                      href={item.href}
                      isActive={isActiveAccountSettingsItem(pathname, item.href)}
                      key={item.href}
                      label={item.label}
                    >
                      <Icon className="size-4" />
                    </BusinessSettingsNavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </div>
  );
}
