"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useMemo } from "react";

import { MobileTabsCombobox } from "@/components/shared/mobile-tabs-combobox";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { cn } from "@/lib/utils";

type SettingsSidebarNavItem<TIcon extends string> = {
  href: string;
  label: string;
  icon: TIcon;
};

type SettingsSidebarNavGroup<TIcon extends string> = {
  label: string;
  items: SettingsSidebarNavItem<TIcon>[];
};

type SettingsSidebarNavProps<TIcon extends string> = {
  ariaLabel: string;
  groups: SettingsSidebarNavGroup<TIcon>[];
  icons: Record<TIcon, LucideIcon>;
};

function isActiveSettingsTab(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SettingsSidebarNav<TIcon extends string>({
  ariaLabel,
  groups,
  icons,
}: SettingsSidebarNavProps<TIcon>) {
  const pathname = usePathname();
  const router = useProgressRouter();
  const flatItems = useMemo(
    () => groups.flatMap((group) => group.items),
    [groups],
  );
  const activeItem =
    flatItems
      .filter((item) => isActiveSettingsTab(pathname, item.href))
      .sort((a, b) => b.href.length - a.href.length)[0] ?? flatItems[0];

  function handleMobileChange(nextHref: string) {
    if (isActiveSettingsTab(pathname, nextHref)) {
      return;
    }
    router.push(nextHref);
  }

  useEffect(() => {
    for (const item of flatItems) {
      router.prefetch(item.href);
    }
  }, [flatItems, router]);

  if (!activeItem) {
    return null;
  }

  return (
    <>
      {/* Mobile: combobox dropdown */}
      <div className="sm:hidden">
        <MobileTabsCombobox
          groups={groups.map((group) => ({
            label: group.label,
            items: group.items.map((item) => ({
              label: item.label,
              value: item.href,
              icon: icons[item.icon],
            })),
          }))}
          activeValue={activeItem.href}
          onValueChange={handleMobileChange}
        />
      </div>

      {/* Desktop: vertical sidebar nav */}
      <nav
        aria-label={ariaLabel}
        className="hidden shrink-0 sm:block sm:w-48 lg:w-52"
      >
        <div className="sticky top-6 flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <span className="meta-label px-3 pb-1">{group.label}</span>
              {group.items.map((item) => {
                const Icon = icons[item.icon] as LucideIcon;
                const isActive = isActiveSettingsTab(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/[0.07] text-primary dark:bg-primary/[0.12]"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
