"use client";

import type { LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProgressRouter } from "@/hooks/use-progress-router";

type SettingsTabsNavItem<TIcon extends string> = {
  href: string;
  label: string;
  icon: TIcon;
};

type SettingsTabsNavGroup<TIcon extends string> = {
  label: string;
  items: SettingsTabsNavItem<TIcon>[];
};

type SettingsTabsNavProps<TIcon extends string> = {
  ariaLabel: string;
  groups: SettingsTabsNavGroup<TIcon>[];
  icons: Record<TIcon, LucideIcon>;
};

function isActiveSettingsTab(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SettingsTabsNav<TIcon extends string>({
  ariaLabel,
  groups,
  icons,
}: SettingsTabsNavProps<TIcon>) {
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

  function handleTabChange(nextHref: string) {
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
    <nav aria-label={ariaLabel} className="min-w-0">
      <Tabs
        activationMode="manual"
        className="min-w-0"
        onValueChange={handleTabChange}
        value={activeItem.href}
      >
        <div className="min-w-0 overflow-x-auto pb-1 hover-scrollbar">
          <TabsList aria-label={ariaLabel} className="justify-start">
            {flatItems.map((item) => {
              const Icon = icons[item.icon] as LucideIcon;

              return (
                <TabsTrigger key={item.href} value={item.href}>
                  <Icon className="size-4" />
                  {item.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </Tabs>
    </nav>
  );
}
